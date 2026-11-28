package api

import "testing"

func TestNormalizePhoneBR(t *testing.T) {
	for in, want := range map[string]string{
		"(11) 91234-5678":    "+5511912345678",
		"11912345678":        "+5511912345678",
		"011 91234 5678":     "+5511912345678",
		"+55 11 91234-5678":  "+5511912345678",
		"5511912345678":      "+5511912345678",
		"(11) 3456-7890":     "+551134567890",
		"91234-5678":         "",
		"11 81234 5678":      "",
		"abc":                "",
		"+1 415 555 0100 00": "",
	} {
		got, ok := normalizePhoneBR(in)
		if got != want || ok != (want != "") {
			t.Errorf("%q: got %q/%v, want %q", in, got, ok, want)
		}
	}
	h, _ := hashPhoneBR("(11) 91234-5678")
	if h != "195563c1d879cb1564e2cdd6d89363ecb1f091ac0eeac094760f06139eae6077" { // sha256("+5511912345678")
		t.Fatal(h)
	}
}
