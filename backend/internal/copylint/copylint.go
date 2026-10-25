// Package copylint flags wording that Brazilian psychology advertising rules (CFP Res. 010/2005
// and the Código de Ética) don't allow: promised results, superiority claims and prices in
// promotional text. It is a safety net for human review, not a substitute for it.
package copylint

import (
	"regexp"
	"strings"
)

// Flag is one potential problem found in a text.
type Flag struct {
	Rule    string `json:"rule"`
	Match   string `json:"match"`
	Message string `json:"message"`
}

type rule struct {
	name, message string
	re            *regexp.Regexp
}

var rules = []rule{
	{"promised_result", "Não prometa resultados ou cura.",
		regexp.MustCompile(`(?i)\b(cura garantida|garantimos|garantia de (resultado|cura|sucesso)|resultado(s)? garantido(s)?|100 ?% (eficaz|de sucesso)|cure[- ]se|você (vai|irá) se curar|elimin(a|e) (de vez )?(a )?(ansiedade|depress[aã]o))\b`)},
	{"superiority", "Não faça afirmações de superioridade sobre outros profissionais ou abordagens.",
		regexp.MustCompile(`(?i)\b(o melhor psic[oó]logo|a melhor terapia|melhor (psic[oó]logo|profissional|terapeuta) (de|da|do|em)|mais eficaz (que|do que)|[úu]nico (psic[oó]logo|profissional) (que|capaz)|n[úu]mero ?1|l[ií]der em)\b`)},
	{"price", "Não divulgue preços, descontos ou promoções em texto promocional.",
		regexp.MustCompile(`(?i)(R\$\s?\d|\b\d+\s?reais\b|\b(desconto|promo[cç][aã]o|pre[cç]o promocional|oferta especial|primeira sess[aã]o gr[aá]tis|sess[aã]o gratuita)\b)`)},
	{"diagnosis_claim", "Evite sugerir diagnóstico a partir de conteúdo online.",
		regexp.MustCompile(`(?i)\b(voc[eê] (tem|sofre de) (depress[aã]o|ansiedade|tdah|transtorno)|se voc[eê] sente isso, ent[aã]o)\b`)},
}

// Check returns the flags found in text (empty when clean).
func Check(text string) []Flag {
	var out []Flag
	seen := map[string]bool{}
	for _, r := range rules {
		for _, m := range r.re.FindAllString(text, 5) {
			key := r.name + "|" + strings.ToLower(m)
			if seen[key] {
				continue
			}
			seen[key] = true
			out = append(out, Flag{Rule: r.name, Match: m, Message: r.message})
		}
	}
	return out
}
