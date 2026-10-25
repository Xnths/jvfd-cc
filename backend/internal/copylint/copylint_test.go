package copylint

import "testing"

func TestCheck(t *testing.T) {
	bad := map[string]string{
		"promised_result": "Com a terapia, cura garantida em 3 meses.",
		"superiority":     "Sou o melhor psicólogo de São Paulo.",
		"price":           "Sessão por R$ 150, com desconto no primeiro mês.",
		"diagnosis_claim": "Se você sente isso, então você tem depressão.",
	}
	for rule, text := range bad {
		found := false
		for _, f := range Check(text) {
			found = found || f.Rule == rule
		}
		if !found {
			t.Errorf("%s not flagged in %q", rule, text)
		}
	}
	clean := "A Análise do Comportamento estuda como o ambiente e a história de cada pessoa moldam o que fazemos. Converse comigo para entender se faz sentido para você."
	if f := Check(clean); len(f) != 0 {
		t.Errorf("clean text flagged: %+v", f)
	}
}
