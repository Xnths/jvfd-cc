package research

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"unicode"

	"github.com/Xnths/jvfd-cc/backend/internal/copylint"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

//go:embed prompts/joao_style.md
var joaoStyle string

const topicJob = "topic.digest"

// Source is one numbered source of a run: a paper (pubmed/crossref) or a page found by the web search.
type Source struct {
	N       int    `json:"n"`
	Kind    string `json:"kind"` // pubmed | crossref | web
	Title   string `json:"title"`
	Authors string `json:"authors,omitempty"`
	Journal string `json:"journal,omitempty"`
	Year    string `json:"year,omitempty"`
	URL     string `json:"url"`
	Snippet string `json:"snippet,omitempty"`
	// Abstract feeds the prompts only; it is not stored with the run.
	Abstract string `json:"-"`
}

type queries struct {
	PubMed string `json:"pubmed_query"`
	SciELO string `json:"scielo_query"`
	Web    string `json:"web_query"`
}

// Outline is the "ideia de post" that step 2 stores for João to read.
type Outline struct {
	Angle        flexStr `json:"angle"`
	TitleOptions strList `json:"title_options"`
	Hook         flexStr `json:"hook"`
	Sections     []struct {
		Heading flexStr `json:"heading"`
		Points  strList `json:"points"`
		Sources intList `json:"sources"`
	} `json:"sections"`
	ExampleScenario flexStr `json:"example_scenario"`
	ClosingLine     flexStr `json:"closing_line"`
	Cautions        strList `json:"cautions"`
}

type finalDraft struct {
	Title           flexStr `json:"title"`
	Excerpt         flexStr `json:"excerpt"`
	MetaDescription flexStr `json:"meta_description"`
	Keywords        flexStr `json:"keywords"`
	Blocks          []struct {
		Type  flexStr `json:"type"` // h2 | p | ul
		Text  flexStr `json:"text"`
		Items strList `json:"items"`
	} `json:"blocks"`
}

const maxPapers, maxWeb = 6, 4

// DraftTopic runs the three steps for the digest row (already inserted as 'searching'): search sources, outline an
// idea, write the draft post. It never publishes; any failure is recorded on the row and returned. f may be nil
// (no NCBI_EMAIL): the run then relies on the web search alone.
func DraftTopic(ctx context.Context, pool *pgxpool.Pool, f *Fetcher, ai *OpenAI, digestID string) (err error) {
	ctx, meter := WithCostMeter(ctx)
	defer func() {
		if err != nil {
			msg := FriendlyError(err)
			if len(msg) > 500 {
				msg = msg[:500]
			}
			_, _ = pool.Exec(context.Background(), `UPDATE topic_digests SET status = 'failed', error = $2, cost_usd = $3, finished_at = now() WHERE id::text = $1`, digestID, msg, meter.USD())
		}
	}()

	var topic, rationale, related string
	var topicID string
	if err = pool.QueryRow(ctx, `SELECT t.id::text, t.topic, t.rationale, t.related_query FROM topic_digests d JOIN topic_queue t ON t.id = d.topic_id WHERE d.id::text = $1`, digestID).
		Scan(&topicID, &topic, &rationale, &related); err != nil {
		return err
	}
	pauta := fmt.Sprintf("Pauta: %s\nPor que agora: %s\nBusca relacionada: %s", topic, rationale, related)

	// ── Step 1: search ──────────────────────────────────────────────────────
	var q queries
	if err = chatJSON(ctx, ai, "", `Você prepara buscas bibliográficas para um post de blog de psicologia (análise do comportamento) em português do Brasil.
Responda um objeto JSON com: "pubmed_query" (consulta curta em inglês para o PubMed, termos MeSH ou palavras-chave, no máximo 8 termos), "scielo_query" (3 a 6 palavras em português para a SciELO) e "web_query" (uma pergunta em português para uma busca na web de fontes institucionais).`,
		pauta, 200, &q); err != nil {
		return err
	}
	if strings.TrimSpace(q.Web) == "" {
		q.Web = topic
	}
	if strings.TrimSpace(q.SciELO) == "" {
		q.SciELO = topic
	}
	if strings.TrimSpace(q.PubMed) == "" {
		q.PubMed = topic
	}
	qj, _ := json.Marshal(q)
	if _, err = pool.Exec(ctx, `UPDATE topic_digests SET queries = $2 WHERE id::text = $1`, digestID, qj); err != nil {
		return err
	}

	var (
		wg     sync.WaitGroup
		pm, cr []Item
		web    []WebSource
		webErr error
	)
	if f != nil {
		wg.Add(2)
		go func() { defer wg.Done(); pm, _ = f.PubMedSorted(ctx, q.PubMed, 1825, "relevance") }()
		go func() { defer wg.Done(); cr, _ = f.CrossrefSorted(ctx, q.SciELO, "10.1590", 1825, "relevance") }()
	}
	wg.Add(1)
	go func() { defer wg.Done(); web, webErr = ai.WebSearch(ctx, topicJob, q.Web) }()
	wg.Wait()
	if errors.Is(webErr, errBudget) {
		return webErr
	}

	papers := pickPapers(pm, cr)
	sources := make([]Source, 0, maxPapers+maxWeb)
	for _, it := range papers {
		ref := it.URL
		if it.DOI != "" {
			ref = "https://doi.org/" + it.DOI
		}
		sources = append(sources, Source{N: len(sources) + 1, Kind: it.Source, Title: it.Title, Authors: it.Authors, Journal: it.Journal,
			Year: yearOf(it.PublishedOn), URL: ref, Snippet: shorten(it.Abstract, 300), Abstract: it.Abstract})
	}
	for i, w := range web {
		if i == maxWeb {
			break
		}
		title := w.Title
		if title == "" {
			title = w.URL
		}
		sources = append(sources, Source{N: len(sources) + 1, Kind: "web", Title: title, URL: w.URL, Snippet: w.Snippet, Abstract: w.Snippet})
	}
	if len(sources) == 0 {
		if webErr != nil {
			return fmt.Errorf("nenhuma fonte encontrada (busca na web: %w)", webErr)
		}
		return errors.New("nenhuma fonte encontrada para esta pauta")
	}
	sj, _ := json.Marshal(sources)
	if _, err = pool.Exec(ctx, `UPDATE topic_digests SET sources = $2, status = 'outlining' WHERE id::text = $1`, digestID, sj); err != nil {
		return err
	}
	storePapers(ctx, pool, papers)

	// ── Step 2: idea ────────────────────────────────────────────────────────
	numbered := numberedSources(sources)
	var ol Outline
	if err = chatJSON(ctx, ai, "", joaoStyle+`

TAREFA: planejar o post (ainda não escreva o texto). Responda um objeto JSON com:
"angle" (o ângulo do post em 1 ou 2 frases), "title_options" (3 títulos no estilo do João), "hook" (a abertura em 1 ou 2 frases),
"sections" (3 a 5 itens {"heading", "points": [2 a 4 pontos curtos], "sources": [números das fontes que sustentam os pontos]}),
"example_scenario" (uma cena cotidiana que ilustra o tema), "closing_line" (a frase de efeito do fim) e
"cautions" (o que o João precisa conferir antes de publicar: evidência fraca, tema que roça diagnóstico ou risco, afirmações sem fonte).`,
		pauta+"\n\nFontes:\n"+numbered, 1400, &ol); err != nil {
		return err
	}
	if len(ol.Sections) == 0 {
		return errors.New("a ideia do post veio vazia")
	}
	oj, _ := json.Marshal(ol)
	if _, err = pool.Exec(ctx, `UPDATE topic_digests SET outline = $2, status = 'writing' WHERE id::text = $1`, digestID, oj); err != nil {
		return err
	}

	// ── Step 3: final draft ─────────────────────────────────────────────────
	var fd finalDraft
	if err = chatJSON(ctx, ai, ai.DraftModel, joaoStyle+`

TAREFA: escrever o post completo, entre 700 e 1100 palavras, seguindo a ideia aprovada abaixo. Não inclua o bloco de contato.
Responda um objeto JSON com: "title", "excerpt" (1 ou 2 frases, até 200 caracteres), "meta_description" (até 155 caracteres), "keywords" (5 a 8 palavras-chave separadas por vírgula) e
"blocks": uma lista, na ordem do texto, de objetos {"type": "h2" | "p" | "ul", "text": "...", "items": [...]}. Use "text" para h2 e p, e "items" para ul. Use **negrito** só em termos-chave. Marque as fontes como [n].`,
		pauta+"\n\nIdeia aprovada:\n"+string(oj)+"\n\nFontes:\n"+numbered, 3500, &fd); err != nil {
		return err
	}
	if fd.Title == "" || len(fd.Blocks) < 3 {
		return errors.New("o rascunho veio incompleto")
	}

	blocks, used := buildBody(fd, sources)
	plain := plainOf(fd)
	flags := copylint.Check(plain)

	cits := make([]map[string]any, 0, len(used))
	refs := []node{heading("h2", "Referências")}
	for i, s := range used {
		cits = append(cits, map[string]any{"n": i + 1, "title": s.Title, "authors": s.Authors, "journal": s.Journal, "year": s.Year, "url": s.URL})
		line := strings.Trim(strings.Join(nonEmpty(s.Authors, s.Title, s.Journal, s.Year), ". "), ". ")
		refs = append(refs, paragraph(text(fmt.Sprintf("[%d] %s. ", i+1, line), false), link(s.URL, s.URL)))
	}
	all := []node{paragraph(text("Rascunho gerado por IA a partir das fontes abaixo. Confira cada afirmação e cada fonte, reescreva o que não soar como você e apague este aviso antes de publicar.", true))}
	all = append(all, blocks...)
	if len(ol.Cautions) > 0 {
		all = append(all, heading("h2", "Para auditar"), list(ol.Cautions, false))
	}
	all = append(all, refs...)

	cj, _ := json.Marshal(cits)
	slug := slugify(string(fd.Title))
	var postID string
	for i := 0; i < 20; i++ {
		s := slug
		if i > 0 {
			s = fmt.Sprintf("%s-%d", slug, i+1)
		}
		e := pool.QueryRow(ctx, `INSERT INTO posts (slug, title, excerpt, content, origin, citations, keywords, meta_description)
			VALUES ($1,$2,$3,$4,'topic_bot',$5,$6,$7) ON CONFLICT (slug) DO NOTHING RETURNING id::text`,
			s, string(fd.Title), shorten(string(fd.Excerpt), 300), doc(all...), cj, shorten(string(fd.Keywords), 200), shorten(string(fd.MetaDescription), 200)).Scan(&postID)
		if e == nil {
			break
		}
	}
	if postID == "" {
		return errors.New("não foi possível criar o post")
	}
	if _, err = pool.Exec(ctx, `UPDATE research_items SET post_id = $1::uuid WHERE status = 'drafted' AND post_id IS NULL AND (source, external_id) IN (SELECT unnest($2::text[]), unnest($3::text[]))`,
		postID, itemSources(papers), itemIDs(papers)); err != nil {
		return err
	}
	if _, err = pool.Exec(ctx, `UPDATE topic_digests SET status = 'done', post_id = $2::uuid, lint_flags = $3, cost_usd = $4, finished_at = now() WHERE id::text = $1`,
		digestID, postID, len(flags), meter.USD()); err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `UPDATE topic_queue SET status = 'in_progress' WHERE id::text = $1`, topicID)
	return err
}

// chatJSON asks for a JSON object and decodes it into v. A reply that cannot be read is asked for once more
// (cheap next to the cost of losing the whole run); the second failure is returned as a *FormatError.
func chatJSON(ctx context.Context, ai *OpenAI, model, system, user string, maxTokens int, v any) error {
	var err error
	for attempt := 0; attempt < 2; attempt++ {
		var out string
		if out, err = ai.Chat(ctx, topicJob, model, system, user, maxTokens, true); err != nil {
			return err
		}
		if err = decodeModelJSON(out, v); err == nil {
			return nil
		}
	}
	return err
}

// pickPapers keeps the best papers with an abstract: PubMed first (reviews and trials rank higher), then SciELO.
func pickPapers(pm, cr []Item) []Item {
	var out []Item
	take := func(items []Item, n int) {
		var withAbs []Item
		for _, it := range items {
			if strings.TrimSpace(it.Abstract) != "" {
				withAbs = append(withAbs, it)
			}
		}
		sort.SliceStable(withAbs, func(i, j int) bool { return withAbs[i].Score > withAbs[j].Score })
		if len(withAbs) > n {
			withAbs = withAbs[:n]
		}
		out = append(out, withAbs...)
	}
	take(pm, 4)
	take(cr, maxPapers-len(out))
	return out
}

// storePapers keeps the run's papers in research_items (marked drafted, so the weekly digest does not reuse them).
func storePapers(ctx context.Context, pool *pgxpool.Pool, papers []Item) {
	for _, it := range papers {
		if it.PubTypes == nil {
			it.PubTypes = []string{}
		}
		var doi any
		if it.DOI != "" {
			doi = it.DOI
		}
		_, _ = pool.Exec(ctx, `INSERT INTO research_items (source, external_id, doi, title, authors, journal, published_on, abstract, url, pub_types, score, status)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'drafted')
			ON CONFLICT (source, external_id) DO UPDATE SET status = CASE WHEN research_items.status = 'new' THEN 'drafted' ELSE research_items.status END`,
			it.Source, it.ExternalID, doi, it.Title, it.Authors, it.Journal, it.PublishedOn, it.Abstract, it.URL, it.PubTypes, it.Score)
	}
}

func itemSources(items []Item) []string {
	out := make([]string, len(items))
	for i, it := range items {
		out[i] = it.Source
	}
	return out
}

func itemIDs(items []Item) []string {
	out := make([]string, len(items))
	for i, it := range items {
		out[i] = it.ExternalID
	}
	return out
}

func numberedSources(sources []Source) string {
	var b strings.Builder
	for _, s := range sources {
		fmt.Fprintf(&b, "[%d] %s", s.N, s.Title)
		if s.Journal != "" || s.Year != "" {
			fmt.Fprintf(&b, " (%s)", strings.TrimSpace(s.Journal+" "+s.Year))
		}
		fmt.Fprintf(&b, "\n%s\n\n", shorten(s.Abstract, 700))
	}
	return b.String()
}

var citeRe = regexp.MustCompile(`\[(\d+)\]`)

// buildBody turns the model's blocks into Lexical nodes. Citation markers are renumbered in order of first use, and
// markers that point at no source are dropped, so the Referências list matches the text exactly.
func buildBody(fd finalDraft, sources []Source) ([]node, []Source) {
	order := map[int]int{}
	var used []Source
	fix := func(s string) string {
		return citeRe.ReplaceAllStringFunc(s, func(m string) string {
			n, _ := strconv.Atoi(m[1 : len(m)-1])
			if n < 1 || n > len(sources) {
				return ""
			}
			if _, ok := order[n]; !ok {
				used = append(used, sources[n-1])
				order[n] = len(used)
			}
			return "[" + strconv.Itoa(order[n]) + "]"
		})
	}
	var out []node
	for _, b := range fd.Blocks {
		switch string(b.Type) {
		case "h1", "h2", "h3":
			if t := strings.TrimSpace(fix(string(b.Text))); t != "" {
				out = append(out, heading("h2", t))
			}
		case "ul", "ol", "list":
			var items []string
			for _, it := range b.Items {
				if t := strings.TrimSpace(fix(it)); t != "" {
					items = append(items, t)
				}
			}
			if len(items) > 0 {
				out = append(out, list(items, b.Type == "ol"))
			}
		default:
			if t := strings.TrimSpace(fix(string(b.Text))); t != "" {
				out = append(out, richParagraph(t))
			}
		}
	}
	return out, used
}

func plainOf(fd finalDraft) string {
	parts := []string{string(fd.Title), string(fd.Excerpt)}
	for _, b := range fd.Blocks {
		parts = append(parts, string(b.Text))
		parts = append(parts, b.Items...)
	}
	return strings.Join(parts, "\n")
}

var nonSlug = regexp.MustCompile(`[^a-z0-9-]+`)

func slugify(s string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	out, _, err := transform.String(t, s)
	if err != nil {
		out = s
	}
	out = strings.ToLower(strings.TrimSpace(out))
	out = strings.NewReplacer(" ", "-", "_", "-").Replace(out)
	out = nonSlug.ReplaceAllString(out, "")
	out = regexp.MustCompile(`-{2,}`).ReplaceAllString(out, "-")
	out = strings.Trim(out, "-")
	if len(out) > 80 {
		out = strings.Trim(out[:80], "-")
	}
	if out == "" {
		out = "rascunho"
	}
	return out
}
