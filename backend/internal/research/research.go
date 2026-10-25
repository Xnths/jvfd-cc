// Package research collects new public papers (PubMed, SciELO via Crossref) and drafts a weekly digest post.
package research

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Item is a paper as stored in research_items.
type Item struct {
	Source, ExternalID, DOI, Title, Authors, Journal, Abstract, URL string
	PublishedOn                                                     *time.Time
	PubTypes                                                        []string
	Score                                                           float32
}

// Fetcher runs the weekly searches. Base URLs are fields so tests can point them at a local server.
type Fetcher struct {
	HTTP       *http.Client
	Email      string // sent as tool contact to NCBI and as mailto to Crossref (polite pools)
	APIKey     string // optional NCBI key
	EUtilsBase string
	CrossBase  string
}

// NewFetcher returns a Fetcher for the real services.
func NewFetcher(email, apiKey string) *Fetcher {
	return &Fetcher{HTTP: &http.Client{Timeout: 45 * time.Second}, Email: email, APIKey: apiKey,
		EUtilsBase: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils", CrossBase: "https://api.crossref.org"}
}

func (f *Fetcher) get(ctx context.Context, u string) ([]byte, error) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	req.Header.Set("User-Agent", "jvfd-cc-research/1.0 (mailto:"+f.Email+")")
	resp, err := f.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("%s: %d", strings.Split(u, "?")[0], resp.StatusCode)
	}
	return b, nil
}

// score ranks evidence: reviews and trials first, papers without an abstract last.
func score(types []string, hasAbstract bool) float32 {
	s := float32(1)
	for _, t := range types {
		switch strings.ToLower(t) {
		case "meta-analysis":
			s += 3
		case "systematic review":
			s += 3
		case "randomized controlled trial":
			s += 2
		case "review":
			s += 2
		case "clinical trial":
			s += 1
		}
	}
	if hasAbstract {
		s += 1
	} else {
		s -= 1
	}
	return s
}

// ── PubMed ──────────────────────────────────────────────────────────────────

type pubmedSet struct {
	Articles []struct {
		PMID  string `xml:"MedlineCitation>PMID"`
		Title string `xml:"MedlineCitation>Article>ArticleTitle"`
		Abs   []struct {
			Label string `xml:"Label,attr"`
			Text  string `xml:",innerxml"`
		} `xml:"MedlineCitation>Article>Abstract>AbstractText"`
		Journal string `xml:"MedlineCitation>Article>Journal>Title"`
		Year    string `xml:"MedlineCitation>Article>Journal>JournalIssue>PubDate>Year"`
		Month   string `xml:"MedlineCitation>Article>Journal>JournalIssue>PubDate>Month"`
		Authors []struct {
			Last string `xml:"LastName"`
			Fore string `xml:"ForeName"`
		} `xml:"MedlineCitation>Article>AuthorList>Author"`
		Types []string `xml:"MedlineCitation>Article>PublicationTypeList>PublicationType"`
		IDs   []struct {
			Type string `xml:"IdType,attr"`
			ID   string `xml:",chardata"`
		} `xml:"PubmedData>ArticleIdList>ArticleId"`
	} `xml:"PubmedArticle"`
}

var tags = regexp.MustCompile(`<[^>]+>`)

func clean(s string) string {
	return strings.Join(strings.Fields(html.UnescapeString(tags.ReplaceAllString(s, " "))), " ")
}

// PubMed returns papers published in the last `days` days that match the query, newest first.
func (f *Fetcher) PubMed(ctx context.Context, query string, days int) ([]Item, error) {
	return f.PubMedSorted(ctx, query, days, "date")
}

// PubMedSorted is PubMed with an explicit esearch sort ("date" or "relevance").
func (f *Fetcher) PubMedSorted(ctx context.Context, query string, days int, sort string) ([]Item, error) {
	common := url.Values{"tool": {"jvfd-cc"}, "email": {f.Email}}
	if f.APIKey != "" {
		common.Set("api_key", f.APIKey)
	}
	q := url.Values{"db": {"pubmed"}, "retmode": {"json"}, "retmax": {"20"}, "sort": {sort}, "datetype": {"pdat"}, "reldate": {fmt.Sprint(days)}, "term": {query}}
	for k, v := range common {
		q[k] = v
	}
	b, err := f.get(ctx, f.EUtilsBase+"/esearch.fcgi?"+q.Encode())
	if err != nil {
		return nil, err
	}
	var sr struct {
		Result struct {
			IDs []string `json:"idlist"`
		} `json:"esearchresult"`
	}
	if err := json.Unmarshal(b, &sr); err != nil {
		return nil, err
	}
	if len(sr.Result.IDs) == 0 {
		return nil, nil
	}
	fq := url.Values{"db": {"pubmed"}, "retmode": {"xml"}, "id": {strings.Join(sr.Result.IDs, ",")}}
	for k, v := range common {
		fq[k] = v
	}
	xb, err := f.get(ctx, f.EUtilsBase+"/efetch.fcgi?"+fq.Encode())
	if err != nil {
		return nil, err
	}
	var set pubmedSet
	if err := xml.Unmarshal(xb, &set); err != nil {
		return nil, err
	}
	var out []Item
	for _, a := range set.Articles {
		var abs []string
		for _, p := range a.Abs {
			t := clean(p.Text)
			if p.Label != "" {
				t = p.Label + ": " + t
			}
			abs = append(abs, t)
		}
		var authors []string
		for i, au := range a.Authors {
			if i == 6 {
				authors = append(authors, "et al.")
				break
			}
			authors = append(authors, strings.TrimSpace(au.Last+" "+au.Fore))
		}
		it := Item{Source: "pubmed", ExternalID: a.PMID, Title: clean(a.Title), Authors: strings.Join(authors, ", "), Journal: a.Journal,
			Abstract: strings.Join(abs, "\n"), URL: "https://pubmed.ncbi.nlm.nih.gov/" + a.PMID + "/", PubTypes: a.Types}
		for _, id := range a.IDs {
			if id.Type == "doi" {
				it.DOI = strings.TrimSpace(id.ID)
			}
		}
		if y := a.Year; y != "" {
			if t, err := time.Parse("2006 Jan", y+" "+firstNonEmpty(a.Month, "Jan")); err == nil {
				it.PublishedOn = &t
			} else if t, err := time.Parse("2006", y); err == nil {
				it.PublishedOn = &t
			}
		}
		it.Score = score(it.PubTypes, it.Abstract != "")
		if it.Title != "" {
			out = append(out, it)
		}
	}
	return out, nil
}

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

// ── Crossref (SciELO prefix 10.1590) ────────────────────────────────────────

// Crossref returns recent journal articles that match the query, optionally restricted to a DOI prefix, newest first.
func (f *Fetcher) Crossref(ctx context.Context, query, prefix string, days int) ([]Item, error) {
	return f.CrossrefSorted(ctx, query, prefix, days, "published")
}

// CrossrefSorted is Crossref with an explicit sort ("published" or "relevance").
func (f *Fetcher) CrossrefSorted(ctx context.Context, query, prefix string, days int, sort string) ([]Item, error) {
	filters := []string{"type:journal-article", "from-pub-date:" + time.Now().AddDate(0, 0, -days).Format("2006-01-02")}
	if prefix != "" {
		filters = append(filters, "prefix:"+prefix)
	}
	q := url.Values{"query": {query}, "filter": {strings.Join(filters, ",")}, "rows": {"20"}, "sort": {sort}, "order": {"desc"}, "mailto": {f.Email}}
	b, err := f.get(ctx, f.CrossBase+"/works?"+q.Encode())
	if err != nil {
		return nil, err
	}
	var res struct {
		Message struct {
			Items []struct {
				DOI    string   `json:"DOI"`
				Title  []string `json:"title"`
				Cont   []string `json:"container-title"`
				URL    string   `json:"URL"`
				Abs    string   `json:"abstract"`
				Author []struct {
					Given  string `json:"given"`
					Family string `json:"family"`
				} `json:"author"`
				Issued struct {
					Parts [][]int `json:"date-parts"`
				} `json:"issued"`
			} `json:"items"`
		} `json:"message"`
	}
	if err := json.Unmarshal(b, &res); err != nil {
		return nil, err
	}
	var out []Item
	for _, w := range res.Message.Items {
		if len(w.Title) == 0 {
			continue
		}
		var authors []string
		for i, a := range w.Author {
			if i == 6 {
				authors = append(authors, "et al.")
				break
			}
			authors = append(authors, strings.TrimSpace(a.Family+" "+a.Given))
		}
		it := Item{Source: "crossref", ExternalID: strings.ToLower(w.DOI), DOI: w.DOI, Title: clean(w.Title[0]), Authors: strings.Join(authors, ", "),
			Journal: strings.Join(w.Cont, ""), Abstract: clean(w.Abs), URL: firstNonEmpty(w.URL, "https://doi.org/"+w.DOI), PubTypes: []string{"journal article"}}
		if len(w.Issued.Parts) > 0 && len(w.Issued.Parts[0]) > 0 {
			p := w.Issued.Parts[0]
			m, d := 1, 1
			if len(p) > 1 {
				m = p[1]
			}
			if len(p) > 2 {
				d = p[2]
			}
			t := time.Date(p[0], time.Month(m), d, 0, 0, 0, 0, time.UTC)
			it.PublishedOn = &t
		}
		it.Score = score(it.PubTypes, it.Abstract != "")
		out = append(out, it)
	}
	return out, nil
}

// Fetch runs every enabled query and stores new items. It returns how many were new.
func Fetch(ctx context.Context, pool *pgxpool.Pool, f *Fetcher) (map[string]any, error) {
	res := map[string]any{}
	rows, err := pool.Query(ctx, `SELECT id::text, kind, query, filters FROM research_queries WHERE enabled`)
	if err != nil {
		return res, err
	}
	type q struct {
		id, kind, query string
		filters         map[string]any
	}
	var qs []q
	for rows.Next() {
		var x q
		var raw []byte
		if err := rows.Scan(&x.id, &x.kind, &x.query, &raw); err != nil {
			rows.Close()
			return res, err
		}
		_ = json.Unmarshal(raw, &x.filters)
		qs = append(qs, x)
	}
	rows.Close()
	var added, failed int
	var lastErr string
	for _, x := range qs {
		days := 30
		if v, ok := x.filters["days"].(float64); ok && v > 0 {
			days = int(v)
		}
		var items []Item
		var err error
		if x.kind == "pubmed" {
			items, err = f.PubMed(ctx, x.query, days)
		} else {
			prefix, _ := x.filters["prefix"].(string)
			items, err = f.Crossref(ctx, x.query, prefix, days)
		}
		if err != nil {
			failed++
			lastErr = err.Error()
			continue // one broken source must not hide the others
		}
		for _, it := range items {
			if it.PubTypes == nil {
				it.PubTypes = []string{}
			}
			var doi any
			if it.DOI != "" {
				doi = it.DOI
			}
			tag, err := pool.Exec(ctx, `INSERT INTO research_items (source, external_id, doi, title, authors, journal, published_on, abstract, url, pub_types, score)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
				it.Source, it.ExternalID, doi, it.Title, it.Authors, it.Journal, it.PublishedOn, it.Abstract, it.URL, it.PubTypes, it.Score)
			if err != nil {
				return res, err
			}
			added += int(tag.RowsAffected())
		}
		_, _ = pool.Exec(ctx, `UPDATE research_queries SET last_run_at = now() WHERE id::text = $1`, x.id)
	}
	res["queries"], res["new_items"], res["failed_queries"] = len(qs), added, failed
	if lastErr != "" {
		res["last_error"] = lastErr
	}
	if len(qs) > 0 && failed == len(qs) {
		return res, fmt.Errorf("every research source failed: %s", lastErr)
	}
	return res, nil
}
