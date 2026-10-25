package seo

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// base is the shared CTE: 28-day windows over gsc_daily, ending on the newest synced day.
const base = `
WITH bounds AS (SELECT max(date) AS d FROM gsc_daily),
pq AS (
  SELECT regexp_replace(g.page, '^https?://[^/]+', '') AS path, g.query,
         sum(g.impressions) AS impressions, sum(g.clicks) AS clicks,
         sum(g.position * g.impressions) / nullif(sum(g.impressions), 0) AS position
  FROM gsc_daily g, bounds b WHERE g.date > b.d - 28 GROUP BY 1, 2
)`

type rule struct {
	kind, sql string
	build     func(r map[string]any) (target, query string, metrics, proposal map[string]any)
}

// expectedCTR is a rough organic CTR by position, used to spot titles that underperform.
func expectedCTR(pos float64) float64 {
	switch {
	case pos <= 1.5:
		return 0.28
	case pos <= 2.5:
		return 0.15
	case pos <= 3.5:
		return 0.10
	case pos <= 4.5:
		return 0.07
	case pos <= 5.5:
		return 0.05
	}
	return 0.035
}

// Opportunities turns the last 28 days of Search Console data into suggestions for João. It never changes content:
// every suggestion waits in the inbox until it is applied or dismissed. Re-running is safe (dedupe keys).
func Opportunities(ctx context.Context, pool *pgxpool.Pool) (map[string]any, error) {
	res := map[string]any{}
	var has bool
	if err := pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM gsc_daily)`).Scan(&has); err != nil {
		return res, err
	}
	if !has {
		res["skipped"] = "no Search Console data yet"
		return res, nil
	}
	rules := []rule{
		{"striking_distance", base + `SELECT path, query, impressions, clicks, position FROM pq
			WHERE position BETWEEN 8 AND 20 AND impressions >= 30 ORDER BY impressions DESC LIMIT 25`,
			func(r map[string]any) (string, string, map[string]any, map[string]any) {
				return r["path"].(string), r["query"].(string), r,
					map[string]any{"action": "strengthen_page", "hint": fmt.Sprintf("A busca “%s” já leva a esta página, na posição %.0f. Reforçar o tema no título, nos subtítulos e na FAQ pode levá-la à primeira página.", r["query"], r["position"])}
			}},
		{"low_ctr", base + `SELECT path, query, impressions, clicks, position FROM pq
			WHERE position <= 6 AND impressions >= 100 ORDER BY impressions DESC LIMIT 60`,
			func(r map[string]any) (string, string, map[string]any, map[string]any) {
				ctr := float64(r["clicks"].(int64)) / float64(r["impressions"].(int64))
				if ctr >= expectedCTR(r["position"].(float64))*0.6 {
					return "", "", nil, nil
				}
				r["ctr"] = ctr
				return r["path"].(string), r["query"].(string), r,
					map[string]any{"action": "rewrite_title_meta", "hint": fmt.Sprintf("Para “%s” esta página aparece bem (posição %.1f), mas poucas pessoas clicam (%.1f%%). Vale reescrever o título e a descrição para o Google.", r["query"], r["position"], ctr*100)}
			}},
		{"cannibalization", base + `SELECT a.query, a.path AS path, b.path AS other, a.impressions, a.position, b.position AS other_position FROM pq a JOIN pq b ON a.query = b.query AND a.path < b.path
			WHERE a.impressions >= 10 AND b.impressions >= 10 AND abs(a.position - b.position) <= 8 ORDER BY a.impressions DESC LIMIT 25`,
			func(r map[string]any) (string, string, map[string]any, map[string]any) {
				return r["path"].(string), r["query"].(string), r,
					map[string]any{"action": "merge_or_differentiate", "hint": fmt.Sprintf("Duas páginas disputam “%s”: %s e %s. Defina qual é a principal e ajuste a outra para outro foco (ou una as duas).", r["query"], r["path"], r["other"])}
			}},
		{"decay", base + `, pg AS (
			SELECT regexp_replace(g.page, '^https?://[^/]+', '') AS path,
			       sum(g.clicks) FILTER (WHERE g.date > b.d - 28) AS recent, sum(g.clicks) FILTER (WHERE g.date <= b.d - 28 AND g.date > b.d - 56) AS previous
			FROM gsc_daily g, bounds b GROUP BY 1)
			SELECT path, recent, previous FROM pg WHERE previous >= 20 AND recent < previous * 0.7 ORDER BY previous - recent DESC LIMIT 15`,
			func(r map[string]any) (string, string, map[string]any, map[string]any) {
				return r["path"].(string), "", r,
					map[string]any{"action": "refresh_content", "hint": fmt.Sprintf("Os cliques desta página caíram de %v para %v em 4 semanas. Vale revisar e atualizar o conteúdo.", r["previous"], r["recent"])}
			}},
		{"faq_candidate", base + `SELECT query, sum(impressions) AS impressions FROM pq
			WHERE query ~* '^(como|o que|oque|por ?que|quando|qual|quais|quanto|quem|posso|devo|é normal|existe|vale a pena|onde|será que)\y'
			  AND NOT EXISTS (SELECT 1 FROM faq_questions f WHERE f.status IN ('answered','published') AND word_similarity(unaccent(lower(pq.query)), unaccent(lower(f.question))) > 0.6)
			GROUP BY query HAVING sum(impressions) >= 15 ORDER BY 2 DESC LIMIT 25`,
			func(r map[string]any) (string, string, map[string]any, map[string]any) {
				q := r["query"].(string)
				return "", q, r, map[string]any{"action": "answer_question", "question": q, "hint": "Pessoas buscam isto no Google e o site ainda não responde. Vale publicar a resposta em Perguntas."}
			}},
		{"content_gap", base + `, covered AS (
			SELECT unaccent(lower(title || ' ' || keywords)) AS t FROM posts WHERE status = 'published'
			UNION ALL SELECT unaccent(lower(term || ' ' || array_to_string(alt_names, ' '))) FROM glossary_terms WHERE status = 'published'
			UNION ALL SELECT unaccent(lower(name || ' ' || card_title || ' ' || card_description)) FROM services
			UNION ALL SELECT unaccent(lower(title || ' ' || subtitle || ' ' || meta_title)) FROM pages WHERE status = 'published')
			SELECT query, sum(impressions) AS impressions, min(position) AS best_position FROM pq
			WHERE NOT EXISTS (SELECT 1 FROM covered c WHERE word_similarity(unaccent(lower(pq.query)), c.t) > 0.6)
			GROUP BY query HAVING sum(impressions) >= 20 AND min(position) > 15 ORDER BY 2 DESC LIMIT 25`,
			func(r map[string]any) (string, string, map[string]any, map[string]any) {
				q := r["query"].(string)
				return "", q, r, map[string]any{"action": "write_post", "title": q, "hint": "O site aparece para esta busca sem ter conteúdo sobre ela. Um post ou verbete do glossário pode cobrir o tema."}
			}},
	}
	for _, rl := range rules {
		n, err := runRule(ctx, pool, rl)
		if err != nil {
			return res, fmt.Errorf("%s: %w", rl.kind, err)
		}
		res[rl.kind] = n
	}
	return res, nil
}

func runRule(ctx context.Context, pool *pgxpool.Pool, rl rule) (int, error) {
	rows, err := pool.Query(ctx, rl.sql)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	cols := rows.FieldDescriptions()
	type item struct {
		target, query string
		metrics, prop map[string]any
	}
	var items []item
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return 0, err
		}
		row := map[string]any{}
		for i, c := range cols {
			row[c.Name] = vals[i]
		}
		target, query, metrics, proposal := rl.build(row)
		if metrics == nil {
			continue
		}
		items = append(items, item{target, query, metrics, proposal})
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, it := range items {
		m, _ := json.Marshal(it.metrics)
		p, _ := json.Marshal(it.prop)
		key := rl.kind + "|" + it.target + "|" + it.query
		if _, err := pool.Exec(ctx, `INSERT INTO seo_suggestions (kind, dedupe_key, target_type, target_id, query, page, metrics, proposal)
			VALUES ($1,$2,$3,$4,$5,$4,$6,$7)
			ON CONFLICT (dedupe_key) DO UPDATE SET metrics = EXCLUDED.metrics, proposal = EXCLUDED.proposal, updated_at = now() WHERE seo_suggestions.status = 'new'`,
			rl.kind, key, targetType(it.target), it.target, it.query, m, p); err != nil {
			return 0, err
		}
	}
	return len(items), nil
}

func targetType(t string) string {
	if t == "" {
		return ""
	}
	return "page"
}
