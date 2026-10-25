package research

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// OpenAISummarizer writes the short PT-BR summaries of the weekly digest. It only ever sees public paper
// metadata (title, journal, abstract), spends are logged in llm_usage, and once the month's estimate reaches
// BudgetUSD it returns an error so the digest falls back to quoting the abstract.
type OpenAISummarizer struct {
	Key       string
	Model     string
	BudgetUSD float64
	Base      string // overridable in tests
	HTTP      *http.Client
	Pool      *pgxpool.Pool
}

// Approximate USD per million tokens (gpt-4o-mini rates); the estimate only drives the budget guard.
const (
	inputUSDPerM  = 0.15
	outputUSDPerM = 0.60
)

var errBudget = errors.New("monthly LLM budget reached")

const systemPrompt = `Você resume artigos científicos de psicologia para o blog de um psicólogo clínico brasileiro (CRP 06/157908).
Escreva em português do Brasil, em até 3 frases, só com o que o resumo do artigo afirma (tipo de estudo, amostra e achado principal).
Regras (Resolução CFP 010/2005): não prometa resultados nem cura, não diga que um tratamento é melhor que outro, não dê orientação clínica ou conselho individual, não cite preços.
Use linguagem cautelosa ("o estudo sugere", "os autores observaram"). Não invente dados que não estejam no texto.`

func NewOpenAISummarizer(pool *pgxpool.Pool, key, model string, budgetUSD float64) *OpenAISummarizer {
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &OpenAISummarizer{Key: key, Model: model, BudgetUSD: budgetUSD, Base: "https://api.openai.com",
		HTTP: &http.Client{Timeout: 20 * time.Second}, Pool: pool}
}

func (o *OpenAISummarizer) Summarize(ctx context.Context, it Item) (string, error) {
	if o.Pool != nil && o.BudgetUSD > 0 {
		var spent float64
		if err := o.Pool.QueryRow(ctx, `SELECT coalesce(sum(est_cost_usd),0)::float8 FROM llm_usage WHERE at >= date_trunc('month', now())`).Scan(&spent); err != nil {
			return "", err
		}
		if spent >= o.BudgetUSD {
			return "", errBudget
		}
	}
	user := fmt.Sprintf("Título: %s\nPeriódico: %s\nResumo original:\n%s", it.Title, it.Journal, shorten(it.Abstract, 3000))
	body, _ := json.Marshal(map[string]any{
		"model": o.Model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": user},
		},
		"max_completion_tokens": 300,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, o.Base+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+o.Key)
	resp, err := o.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("openai: status %d", resp.StatusCode)
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			Details          struct {
				Cached int `json:"cached_tokens"`
			} `json:"prompt_tokens_details"`
		} `json:"usage"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || len(out.Choices) == 0 {
		return "", errors.New("openai: unexpected response")
	}
	if o.Pool != nil {
		cost := float64(out.Usage.PromptTokens)/1e6*inputUSDPerM + float64(out.Usage.CompletionTokens)/1e6*outputUSDPerM
		_, _ = o.Pool.Exec(ctx, `INSERT INTO llm_usage (job, model, input_tokens, output_tokens, cache_read_tokens, est_cost_usd) VALUES ('research.digest', $1, $2, $3, $4, $5)`,
			o.Model, out.Usage.PromptTokens, out.Usage.CompletionTokens, out.Usage.Details.Cached, cost)
	}
	return strings.TrimSpace(out.Choices[0].Message.Content), nil
}
