package research

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// OpenAI is the small client behind the weekly digest summaries and the "Gerar rascunho" pipeline. It only ever
// sees public paper metadata and the pauta text, every spend is logged in llm_usage, and once the month's estimate
// reaches BudgetUSD it returns errBudget so callers can fall back (the digest quotes the abstract).
type OpenAI struct {
	Key        string
	Model      string
	DraftModel string // optional: the model that writes the final post (defaults to Model)
	BudgetUSD  float64
	Base       string // overridable in tests and for proxies
	HTTP       *http.Client
	Pool       *pgxpool.Pool
}

// Approximate USD per million tokens {input, output}; the estimate only drives the budget guard.
var pricePerM = map[string][2]float64{
	"gpt-4o-mini":  {0.15, 0.60},
	"gpt-4.1-mini": {0.40, 1.60},
	"gpt-4.1-nano": {0.10, 0.40},
}

// webSearchUSD is the per-call fee of the web_search tool (low context), added to the token cost.
const webSearchUSD = 0.025

var errBudget = errors.New("monthly LLM budget reached")

// APIError is a non-200 answer from OpenAI. Code is the API's error code (insufficient_quota, rate_limit_exceeded,
// invalid_api_key, model_not_found…); Message is OpenAI's own text and only goes to the logs, never to the admin screen.
type APIError struct {
	Status  int
	Code    string
	Message string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("openai: status %d (%s): %s", e.Status, e.Code, e.Message)
}

func apiError(status int, raw []byte) *APIError {
	var out struct {
		Error struct {
			Type    string `json:"type"`
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.Unmarshal(raw, &out)
	code := out.Error.Code
	if code == "" {
		code = out.Error.Type
	}
	return &APIError{Status: status, Code: code, Message: shorten(out.Error.Message, 300)}
}

// retryUnit is one "second" of the retry wait (tests shrink it).
var retryUnit = time.Second

// retryAfter is how long to wait before the single retry of a rate-limited call (the Retry-After header, 2–10 s).
func retryAfter(h http.Header) time.Duration {
	secs := 3
	if v, err := strconv.Atoi(h.Get("Retry-After")); err == nil {
		secs = v
	}
	return time.Duration(min(max(secs, 2), 10)) * retryUnit
}

// FriendlyError is the Portuguese explanation shown on the pauta when a run fails.
func FriendlyError(err error) string {
	var ae *APIError
	var fe *FormatError
	switch {
	case errors.As(err, &fe):
		return "A IA respondeu num formato inesperado duas vezes. Tente de novo."
	case errors.Is(err, errBudget):
		return "O orçamento mensal de IA acabou. Aumente LLM_MONTHLY_BUDGET_USD ou espere o próximo mês."
	case !errors.As(err, &ae):
		return err.Error()
	case ae.Code == "insufficient_quota":
		return "A conta da OpenAI está sem crédito. Adicione saldo em platform.openai.com (Billing) e tente de novo."
	case ae.Status == http.StatusTooManyRequests:
		return "A OpenAI limitou as requisições. Tente de novo em um minuto."
	case ae.Status == http.StatusUnauthorized || ae.Code == "invalid_api_key":
		return "Chave da OpenAI inválida (OPENAI_API_KEY)."
	case ae.Status == http.StatusForbidden || ae.Status == http.StatusNotFound || ae.Code == "model_not_found":
		return "A chave da OpenAI não tem acesso ao modelo configurado (OPENAI_MODEL)."
	}
	return fmt.Sprintf("Erro da OpenAI (%d, %s).", ae.Status, ae.Code)
}

const systemPrompt = `Você resume artigos científicos de psicologia para o blog de um psicólogo clínico brasileiro (CRP 06/157908).
Escreva em português do Brasil, em até 3 frases, só com o que o resumo do artigo afirma (tipo de estudo, amostra e achado principal).
Regras (Resolução CFP 010/2005): não prometa resultados nem cura, não diga que um tratamento é melhor que outro, não dê orientação clínica ou conselho individual, não cite preços.
Use linguagem cautelosa ("o estudo sugere", "os autores observaram"). Não invente dados que não estejam no texto.`

func NewOpenAISummarizer(pool *pgxpool.Pool, key, model string, budgetUSD float64) *OpenAI {
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &OpenAI{Key: key, Model: model, BudgetUSD: budgetUSD, Base: "https://api.openai.com",
		HTTP: &http.Client{Timeout: 90 * time.Second}, Pool: pool}
}

// CostMeter adds up what one pipeline run spent. Attach it to the context with WithCostMeter.
type CostMeter struct {
	mu  sync.Mutex
	usd float64
}

type meterKey struct{}

func WithCostMeter(ctx context.Context) (context.Context, *CostMeter) {
	m := &CostMeter{}
	return context.WithValue(ctx, meterKey{}, m), m
}

func (m *CostMeter) USD() float64 {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.usd
}

type usage struct {
	In, Out, Cached int
}

// call posts body to path after the budget check and records the spend under job.
func (o *OpenAI) call(ctx context.Context, job, model, path string, body map[string]any, extraUSD float64) ([]byte, error) {
	if o.Pool != nil && o.BudgetUSD > 0 {
		var spent float64
		if err := o.Pool.QueryRow(ctx, `SELECT coalesce(sum(est_cost_usd),0)::float8 FROM llm_usage WHERE at >= date_trunc('month', now())`).Scan(&spent); err != nil {
			return nil, err
		}
		if spent >= o.BudgetUSD {
			return nil, errBudget
		}
	}
	body["model"] = model
	b, _ := json.Marshal(body)
	var raw []byte
	for attempt := 0; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, o.Base+path, bytes.NewReader(b))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+o.Key)
		resp, err := o.HTTP.Do(req)
		if err != nil {
			return nil, err
		}
		raw, _ = io.ReadAll(io.LimitReader(resp.Body, 4<<20))
		resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			break
		}
		ae := apiError(resp.StatusCode, raw)
		// A real rate limit clears in seconds; a missing balance (insufficient_quota) never does.
		if attempt == 0 && resp.StatusCode == http.StatusTooManyRequests && ae.Code != "insufficient_quota" {
			select {
			case <-time.After(retryAfter(resp.Header)):
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}
		return nil, ae
	}
	var u struct {
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			InputTokens      int `json:"input_tokens"`
			OutputTokens     int `json:"output_tokens"`
			Details          struct {
				Cached int `json:"cached_tokens"`
			} `json:"prompt_tokens_details"`
		} `json:"usage"`
	}
	_ = json.Unmarshal(raw, &u)
	us := usage{In: u.Usage.PromptTokens + u.Usage.InputTokens, Out: u.Usage.CompletionTokens + u.Usage.OutputTokens, Cached: u.Usage.Details.Cached}
	price, ok := pricePerM[model]
	if !ok {
		price = pricePerM["gpt-4o-mini"]
	}
	cost := float64(us.In)/1e6*price[0] + float64(us.Out)/1e6*price[1] + extraUSD
	if m, _ := ctx.Value(meterKey{}).(*CostMeter); m != nil {
		m.mu.Lock()
		m.usd += cost
		m.mu.Unlock()
	}
	if o.Pool != nil {
		_, _ = o.Pool.Exec(ctx, `INSERT INTO llm_usage (job, model, input_tokens, output_tokens, cache_read_tokens, est_cost_usd) VALUES ($1, $2, $3, $4, $5, $6)`,
			job, model, us.In, us.Out, us.Cached, cost)
	}
	return raw, nil
}

// Chat runs one chat completion. model "" means o.Model; jsonMode asks for a JSON object (the prompt must say "JSON").
func (o *OpenAI) Chat(ctx context.Context, job, model, system, user string, maxTokens int, jsonMode bool) (string, error) {
	if model == "" {
		model = o.Model
	}
	body := map[string]any{
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
		"max_completion_tokens": maxTokens,
	}
	if jsonMode {
		body["response_format"] = map[string]string{"type": "json_object"}
	}
	raw, err := o.call(ctx, job, model, "/v1/chat/completions", body, 0)
	if err != nil {
		return "", err
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || len(out.Choices) == 0 {
		return "", errors.New("openai: unexpected response")
	}
	return strings.TrimSpace(out.Choices[0].Message.Content), nil
}

func (o *OpenAI) Summarize(ctx context.Context, it Item) (string, error) {
	user := fmt.Sprintf("Título: %s\nPeriódico: %s\nResumo original:\n%s", it.Title, it.Journal, shorten(it.Abstract, 3000))
	return o.Chat(ctx, "research.digest", "", systemPrompt, user, 300, false)
}

// WebSource is a page the web search cited.
type WebSource struct {
	Title, URL, Snippet string
}

const webSearchSystem = `Você pesquisa fontes para um post de blog de um psicólogo brasileiro. Prefira fontes institucionais e confiáveis em português (gov.br, Ministério da Saúde, Fiocruz, OPAS/OMS, CFP e CRPs, universidades, SciELO). Evite blogs de clínicas, vendas de cursos e conteúdo sem autoria.
Responda com até 5 tópicos curtos, um por linha, cada um resumindo o que a fonte afirma, sem opinião própria.`

// WebSearch runs one web_search call (Responses API) and returns the pages it cited, at most 5.
func (o *OpenAI) WebSearch(ctx context.Context, job, query string) ([]WebSource, error) {
	body := map[string]any{
		"instructions":      webSearchSystem,
		"input":             query,
		"tools":             []map[string]any{{"type": "web_search", "search_context_size": "low"}},
		"tool_choice":       "required",
		"max_output_tokens": 900,
	}
	raw, err := o.call(ctx, job, o.Model, "/v1/responses", body, webSearchUSD)
	if err != nil {
		return nil, err
	}
	var out struct {
		Output []struct {
			Type    string `json:"type"`
			Content []struct {
				Type        string `json:"type"`
				Text        string `json:"text"`
				Annotations []struct {
					Type  string `json:"type"`
					URL   string `json:"url"`
					Title string `json:"title"`
					End   int    `json:"end_index"`
				} `json:"annotations"`
			} `json:"content"`
		} `json:"output"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, errors.New("openai: unexpected response")
	}
	var res []WebSource
	seen := map[string]bool{}
	for _, item := range out.Output {
		if item.Type != "message" {
			continue
		}
		for _, c := range item.Content {
			runes := []rune(c.Text)
			for _, a := range c.Annotations {
				u := cleanURL(a.URL)
				if a.Type != "url_citation" || u == "" || seen[u] {
					continue
				}
				seen[u] = true
				res = append(res, WebSource{Title: strings.TrimSpace(a.Title), URL: u, Snippet: lineAt(runes, a.End)})
				if len(res) == 5 {
					return res, nil
				}
			}
		}
	}
	return res, nil
}

// cleanURL drops the tracking parameter the search tool appends.
func cleanURL(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return ""
	}
	q := u.Query()
	q.Del("utm_source")
	u.RawQuery = q.Encode()
	return u.String()
}

// lineAt returns the text line that contains rune offset pos (the sentence a citation belongs to).
func lineAt(runes []rune, pos int) string {
	if pos <= 0 || pos > len(runes) {
		return ""
	}
	start, end := pos-1, pos
	for start > 0 && runes[start-1] != '\n' {
		start--
	}
	for end < len(runes) && runes[end] != '\n' {
		end++
	}
	return shorten(string(runes[start:end]), 400)
}
