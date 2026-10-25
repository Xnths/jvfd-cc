package seo

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const syncKey = "gsc_sync"

// Sync copies Search Console rows into gsc_daily. The first run backfills about 16 months (GSC's limit);
// later runs re-fetch the last 3 days, because recent days are revised after the fact. Safe to repeat.
func Sync(ctx context.Context, pool *pgxpool.Pool, c Client, now time.Time) (map[string]any, error) {
	res := map[string]any{}
	end := day(now).AddDate(0, 0, -2) // GSC data lags about two days
	var start time.Time
	var raw []byte
	err := pool.QueryRow(ctx, `SELECT value FROM job_state WHERE key = $1`, syncKey).Scan(&raw)
	switch {
	case err == nil:
		var st struct {
			LastDate string `json:"last_date"`
		}
		_ = json.Unmarshal(raw, &st)
		last, perr := time.Parse("2006-01-02", st.LastDate)
		if perr != nil {
			start = end.AddDate(0, 0, -480)
		} else {
			start = last.AddDate(0, 0, -3)
		}
	case err == pgx.ErrNoRows:
		start = end.AddDate(0, 0, -480)
		res["backfill"] = true
	default:
		return res, err
	}
	if start.After(end) {
		res["up_to_date"] = true
		return res, nil
	}

	var rows int
	for cur := start; !cur.After(end); cur = cur.AddDate(0, 0, 31) {
		to := cur.AddDate(0, 0, 30)
		if to.After(end) {
			to = end
		}
		batchRows, err := c.Query(ctx, cur, to)
		if err != nil {
			return res, err
		}
		if err := upsert(ctx, pool, batchRows); err != nil {
			return res, err
		}
		rows += len(batchRows)
	}
	state, _ := json.Marshal(map[string]string{"last_date": end.Format("2006-01-02")})
	if _, err := pool.Exec(ctx, `INSERT INTO job_state (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, syncKey, state); err != nil {
		return res, err
	}
	res["rows"], res["from"], res["to"] = rows, start.Format("2006-01-02"), end.Format("2006-01-02")
	return res, nil
}

func day(t time.Time) time.Time {
	y, m, d := t.UTC().Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func upsert(ctx context.Context, pool *pgxpool.Pool, rows []Row) error {
	const chunk = 2000
	for i := 0; i < len(rows); i += chunk {
		part := rows[i:min(i+chunk, len(rows))]
		b := &pgx.Batch{}
		for _, r := range part {
			b.Queue(`INSERT INTO gsc_daily (date, page, query, clicks, impressions, ctr, position) VALUES ($1,$2,$3,$4,$5,$6,$7)
				ON CONFLICT (date, page, query) DO UPDATE SET clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions, ctr = EXCLUDED.ctr, position = EXCLUDED.position`,
				r.Date, r.Page, r.Query, r.Clicks, r.Impressions, r.CTR, r.Position)
		}
		br := pool.SendBatch(ctx, b)
		for range part {
			if _, err := br.Exec(); err != nil {
				br.Close()
				return err
			}
		}
		if err := br.Close(); err != nil {
			return err
		}
	}
	return nil
}
