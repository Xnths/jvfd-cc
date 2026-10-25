package seo

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Radar fills topic_queue with things worth writing about soon: awareness dates that are close, and searches
// whose impressions at least doubled over the last 28 days (there is no public Google Trends API).
func Radar(ctx context.Context, pool *pgxpool.Pool, now time.Time) (map[string]any, error) {
	res := map[string]any{}
	rows, err := pool.Query(ctx, `SELECT name, start_md, topics, lead_days FROM awareness_calendar WHERE active`)
	if err != nil {
		return res, err
	}
	type ev struct {
		name, startMD string
		topics        []string
		lead          int
	}
	var events []ev
	for rows.Next() {
		var e ev
		if err := rows.Scan(&e.name, &e.startMD, &e.topics, &e.lead); err != nil {
			rows.Close()
			return res, err
		}
		events = append(events, e)
	}
	rows.Close()

	today := day(now)
	added := 0
	for _, e := range events {
		start := nextOccurrence(e.startMD, today)
		daysLeft := int(start.Sub(today).Hours() / 24)
		if daysLeft > e.lead {
			continue
		}
		for _, topic := range e.topics {
			tag, err := pool.Exec(ctx, `INSERT INTO topic_queue (topic, rationale, source, target_date, priority, dedupe_key)
				VALUES ($1,$2,'awareness',$3,$4,$5) ON CONFLICT (dedupe_key) DO NOTHING`,
				topic, fmt.Sprintf("%s começa em %d dias. Publicar com antecedência ajuda o conteúdo a ser encontrado na data.", e.name, daysLeft),
				start, max(0, 100-daysLeft), fmt.Sprintf("awareness|%s|%d|%s", e.name, start.Year(), topic))
			if err != nil {
				return res, err
			}
			added += int(tag.RowsAffected())
		}
	}
	res["awareness_added"] = added

	var has bool
	_ = pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM gsc_daily)`).Scan(&has)
	if !has {
		res["rising_skipped"] = "no Search Console data yet"
		return res, nil
	}
	tag, err := pool.Exec(ctx, `
		WITH bounds AS (SELECT max(date) AS d FROM gsc_daily),
		agg AS (
		  SELECT g.query,
		    sum(g.impressions) FILTER (WHERE g.date > b.d - 28) AS recent,
		    coalesce(sum(g.impressions) FILTER (WHERE g.date <= b.d - 28 AND g.date > b.d - 56), 0) AS previous
		  FROM gsc_daily g, bounds b GROUP BY g.query)
		INSERT INTO topic_queue (topic, rationale, source, priority, related_query, dedupe_key)
		SELECT query, 'Buscas por este tema dobraram nas últimas 4 semanas (' || previous || ' → ' || recent || ' impressões).', 'gsc_rising',
		       least(90, recent::int / 5), query, 'rising|' || query || '|' || to_char(now(), 'YYYY-MM')
		FROM agg WHERE recent >= 20 AND previous * 2 <= recent
		ORDER BY recent DESC LIMIT 20
		ON CONFLICT (dedupe_key) DO NOTHING`)
	if err != nil {
		return res, err
	}
	res["rising_added"] = tag.RowsAffected()
	return res, nil
}

// nextOccurrence is the next date (today or later) with the given "MM-DD".
func nextOccurrence(md string, today time.Time) time.Time {
	var m, d int
	fmt.Sscanf(md, "%d-%d", &m, &d)
	t := time.Date(today.Year(), time.Month(m), d, 0, 0, 0, 0, time.UTC)
	if t.Before(today) {
		t = t.AddDate(1, 0, 0)
	}
	return t
}
