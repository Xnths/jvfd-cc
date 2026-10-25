package research

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Summarizer turns an item into a short Portuguese summary. Optional: without one the digest quotes the abstract.
type Summarizer interface {
	Summarize(ctx context.Context, it Item) (string, error)
}

type node = map[string]any

func text(s string, bold bool) node {
	f := 0
	if bold {
		f = 1
	}
	return node{"type": "text", "version": 1, "text": s, "format": f, "mode": "normal", "style": "", "detail": 0}
}

func paragraph(children ...node) node {
	c := make([]any, len(children))
	for i, n := range children {
		c[i] = n
	}
	return node{"type": "paragraph", "version": 1, "format": "", "indent": 0, "direction": nil, "children": c}
}

func heading(tag, s string) node {
	return node{"type": "heading", "tag": tag, "version": 1, "format": "", "indent": 0, "direction": nil, "children": []any{text(s, false)}}
}

func link(label, url string) node {
	return node{"type": "link", "version": 1, "format": "", "indent": 0, "direction": nil, "url": url, "target": "_blank", "rel": "noopener noreferrer", "children": []any{text(label, false)}}
}

func doc(blocks ...node) []byte {
	c := make([]any, len(blocks))
	for i, b := range blocks {
		c[i] = b
	}
	b, _ := json.Marshal(node{"root": node{"type": "root", "version": 1, "format": "", "indent": 0, "direction": nil, "children": c}})
	return b
}

func shorten(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if len(s) <= n {
		return s
	}
	cut := s[:n]
	if i := strings.LastIndexAny(cut, ".;"); i > n/2 {
		return cut[:i+1]
	}
	return strings.TrimSpace(cut) + "…"
}

// Digest drafts one post from the best unused items of the last 14 days. It never publishes: the post waits for
// a clinician, and publishing is blocked until the copy lint is acknowledged and a reviewer is set.
func Digest(ctx context.Context, pool *pgxpool.Pool, now time.Time, sum Summarizer) (map[string]any, error) {
	res := map[string]any{}
	rows, err := pool.Query(ctx, `SELECT id::text, source, external_id, coalesce(doi,''), title, authors, journal, published_on, abstract, url, pub_types, score
		FROM research_items WHERE status = 'new' AND abstract <> '' AND created_at > now() - interval '14 days'
		ORDER BY score DESC, published_on DESC NULLS LAST LIMIT 5`)
	if err != nil {
		return res, err
	}
	type row struct {
		id string
		Item
	}
	var items []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.Source, &r.ExternalID, &r.DOI, &r.Title, &r.Authors, &r.Journal, &r.PublishedOn, &r.Abstract, &r.URL, &r.PubTypes, &r.Score); err != nil {
			rows.Close()
			return res, err
		}
		items = append(items, r)
	}
	rows.Close()
	if len(items) == 0 {
		res["skipped"] = "no new papers with an abstract"
		return res, nil
	}

	blocks := []node{paragraph(text("Rascunho gerado a partir de resumos públicos (PubMed e SciELO). Reescreva com as suas palavras, confira cada fonte e retire este aviso antes de publicar.", false))}
	var citations []map[string]any
	for i, it := range items {
		n := i + 1
		body := shorten(it.Abstract, 700)
		if sum != nil {
			if s, err := sum.Summarize(ctx, it.Item); err == nil && s != "" {
				body = s
			}
		}
		meta := strings.TrimSpace(strings.Join(nonEmpty(it.Journal, yearOf(it.PublishedOn), strings.Join(it.PubTypes, ", ")), " · "))
		blocks = append(blocks,
			heading("h2", it.Title),
			paragraph(text(meta, false)),
			paragraph(text(body, false), text(fmt.Sprintf(" [%d]", n), false)),
		)
		ref := it.URL
		if it.DOI != "" {
			ref = "https://doi.org/" + it.DOI
		}
		citations = append(citations, map[string]any{"n": n, "title": it.Title, "authors": it.Authors, "journal": it.Journal, "year": yearOf(it.PublishedOn), "url": ref})
	}
	blocks = append(blocks, heading("h2", "Referências"))
	for _, c := range citations {
		blocks = append(blocks, paragraph(text(fmt.Sprintf("[%d] %s. %s. %s, %s. ", c["n"], c["authors"], c["title"], c["journal"], c["year"]), false), link(c["url"].(string), c["url"].(string))))
	}

	title := "Pesquisa da semana: " + now.Format("02/01/2006")
	slug := "pesquisa-da-semana-" + now.Format("2006-01-02")
	cj, _ := json.Marshal(citations)
	var postID string
	for i := 0; i < 20; i++ {
		s := slug
		if i > 0 {
			s = fmt.Sprintf("%s-%d", slug, i+1)
		}
		err = pool.QueryRow(ctx, `INSERT INTO posts (slug, title, excerpt, content, origin, citations, keywords)
			VALUES ($1,$2,$3,$4,'research_bot',$5,'pesquisa, psicologia, análise do comportamento') ON CONFLICT (slug) DO NOTHING RETURNING id::text`,
			s, title, "Estudos recentes selecionados da literatura científica, com as fontes citadas.", doc(blocks...), cj).Scan(&postID)
		if err == nil {
			break
		}
	}
	if postID == "" {
		return res, fmt.Errorf("could not create the draft post: %v", err)
	}
	for _, it := range items {
		if _, err := pool.Exec(ctx, `UPDATE research_items SET status = 'drafted', post_id = $2::uuid WHERE id::text = $1`, it.id, postID); err != nil {
			return res, err
		}
	}
	res["post_id"], res["items"] = postID, len(items)
	return res, nil
}

func nonEmpty(s ...string) []string {
	var out []string
	for _, x := range s {
		if strings.TrimSpace(x) != "" {
			out = append(out, x)
		}
	}
	return out
}

func yearOf(t *time.Time) string {
	if t == nil {
		return ""
	}
	return fmt.Sprint(t.Year())
}
