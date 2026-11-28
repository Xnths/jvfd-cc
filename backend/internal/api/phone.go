package api

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

// normalizePhoneBR turns a Brazilian number typed in any form ("(11) 91234-5678", "011912345678",
// "+55 11 91234 5678") into E.164 (+5511912345678), the form Google hashes for user-provided data.
func normalizePhoneBR(s string) (string, bool) {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	d := b.String()
	if len(d) >= 12 && strings.HasPrefix(d, "55") {
		d = d[2:]
	}
	d = strings.TrimLeft(d, "0") // trunk prefix (0 11 ...)
	// DDD (11–99) + 8-digit landline or 9-digit mobile starting with 9.
	if len(d) != 10 && len(d) != 11 || d[0] == '0' || d[1] == '0' || len(d) == 11 && d[2] != '9' {
		return "", false
	}
	return "+55" + d, true
}

// hashPhoneBR returns the lowercase hex SHA-256 of the E.164 number.
func hashPhoneBR(s string) (string, bool) {
	e, ok := normalizePhoneBR(s)
	if !ok {
		return "", false
	}
	h := sha256.Sum256([]byte(e))
	return hex.EncodeToString(h[:]), true
}
