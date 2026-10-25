package research

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	refsHeading = "Referências"
	refsOthers  = "Outras fontes encontradas na pesquisa (confira se cada uma é relevante antes de publicar):"
)

// uncited returns the sources whose number is not among the cited ones (cited carry their original N).
func uncited(all, cited []Source) []Source {
	used := map[int]bool{}
	for _, s := range cited {
		used[s.N] = true
	}
	var rest []Source
	for _, s := range all {
		if !used[s.N] {
			rest = append(rest, s)
		}
	}
	return rest
}

func refParagraph(n int, s Source) node {
	line := strings.Trim(strings.Join(nonEmpty(s.Authors, s.Title, s.Journal, s.Year), ". "), ". ")
	return paragraph(text(fmt.Sprintf("[%d] %s. ", n, line), false), link(s.URL, s.URL))
}

// referenceNodes is the "Referências" section of a draft: the sources the text cites (already numbered as in the
// text), then every other source the research found, numbered on, so João never has to copy sources by hand.
func referenceNodes(cited, rest []Source) []node {
	out := []node{heading("h2", refsHeading)}
	for i, s := range cited {
		out = append(out, refParagraph(i+1, s))
	}
	if len(rest) > 0 {
		out = append(out, paragraph(text(refsOthers, true)))
		for i, s := range rest {
			out = append(out, refParagraph(len(cited)+i+1, s))
		}
	}
	return out
}

// citationsJSON is posts.citations: cited sources first (as numbered in the text), then the rest.
func citationsJSON(cited, rest []Source) []byte {
	out := make([]map[string]any, 0, len(cited)+len(rest))
	add := func(list []Source, isCited bool) {
		for _, s := range list {
			out = append(out, map[string]any{"n": len(out) + 1, "kind": s.Kind, "title": s.Title, "authors": s.Authors, "journal": s.Journal,
				"year": s.Year, "url": s.URL, "cited": isCited})
		}
	}
	add(cited, true)
	add(rest, false)
	b, _ := json.Marshal(out)
	return b
}

// BackfillReferences fills the "Referências" of bot drafts that were saved without them (the text had no [n]
// markers, so only the cited sources were listed and there were none). It only touches drafts of origin topic_bot
// whose Referências heading has nothing after it (or that lack the heading); a draft where someone already wrote
// references, and anything published, is left alone. Safe to run again.
func BackfillReferences(ctx context.Context, pool *pgxpool.Pool) (map[string]any, error) {
	res := map[string]any{}
	rows, err := pool.Query(ctx, `SELECT p.id::text, p.content, d.sources
		FROM posts p
		JOIN LATERAL (SELECT sources FROM topic_digests WHERE post_id = p.id AND status = 'done' ORDER BY created_at DESC LIMIT 1) d ON true
		WHERE p.origin = 'topic_bot' AND p.status = 'draft'`)
	if err != nil {
		return res, err
	}
	type row struct {
		id              string
		content, source []byte
	}
	var found []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.content, &r.source); err != nil {
			rows.Close()
			return res, err
		}
		found = append(found, r)
	}
	rows.Close()

	patched, skipped := 0, 0
	for _, r := range found {
		var sources []Source
		var root map[string]any
		if json.Unmarshal(r.source, &sources) != nil || len(sources) == 0 || json.Unmarshal(r.content, &root) != nil {
			skipped++
			continue
		}
		top, _ := root["root"].(map[string]any)
		children, _ := top["children"].([]any)
		at := len(children)
		for i, c := range children {
			if n, ok := c.(map[string]any); ok && n["type"] == "heading" && nodeText(n) == refsHeading {
				at = i
				break
			}
		}
		if at < len(children)-1 { // something already follows the heading
			skipped++
			continue
		}
		children = children[:at]
		for _, n := range referenceNodes(nil, sources) {
			children = append(children, n)
		}
		top["children"] = children
		content, _ := json.Marshal(root)
		if _, err := pool.Exec(ctx, `UPDATE posts SET content = $2, citations = $3, updated_at = now() WHERE id::text = $1 AND status = 'draft'`,
			r.id, content, citationsJSON(nil, sources)); err != nil {
			return res, err
		}
		patched++
	}
	res["patched"], res["skipped"] = patched, skipped
	return res, nil
}

// nodeText is the plain text of a Lexical node's direct children.
func nodeText(n map[string]any) string {
	var b strings.Builder
	kids, _ := n["children"].([]any)
	for _, k := range kids {
		if c, ok := k.(map[string]any); ok {
			if t, ok := c["text"].(string); ok {
				b.WriteString(t)
			}
		}
	}
	return strings.TrimSpace(b.String())
}
