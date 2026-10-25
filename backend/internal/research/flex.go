package research

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// The model is asked for a JSON shape, but it sometimes sends a list where a string is expected or numbers as text.
// These types accept those variations instead of failing the whole run over a harmless difference.

// flexStr is a string that also accepts a list (joined by new lines), a number or an object (kept as compact JSON).
type flexStr string

func (s *flexStr) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	var str string
	if json.Unmarshal(b, &str) == nil {
		*s = flexStr(strings.TrimSpace(str))
		return nil
	}
	if string(b) == "null" {
		return nil
	}
	var list []flexStr
	if json.Unmarshal(b, &list) == nil {
		parts := make([]string, len(list))
		for i, p := range list {
			parts[i] = string(p)
		}
		*s = flexStr(strings.Join(parts, "\n"))
		return nil
	}
	var obj map[string]flexStr
	if json.Unmarshal(b, &obj) == nil {
		for _, k := range []string{"text", "title", "heading", "content"} {
			if v := obj[k]; v != "" {
				*s = v
				return nil
			}
		}
	}
	*s = flexStr(string(b))
	return nil
}

// strList is a list of strings that also accepts a single string.
type strList []string

func (l *strList) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	if string(b) == "null" {
		return nil
	}
	var one flexStr
	if len(b) > 0 && b[0] != '[' {
		if err := json.Unmarshal(b, &one); err != nil {
			return err
		}
		if one != "" {
			*l = strList{string(one)}
		}
		return nil
	}
	var items []flexStr
	if err := json.Unmarshal(b, &items); err != nil {
		return err
	}
	for _, it := range items {
		if it != "" {
			*l = append(*l, string(it))
		}
	}
	return nil
}

var digits = regexp.MustCompile(`\d+`)

// intList is a list of source numbers that also accepts "1", "[2]" and a single number.
type intList []int

func (l *intList) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	if string(b) == "null" {
		return nil
	}
	if len(b) > 0 && b[0] != '[' {
		b = append(append([]byte{'['}, b...), ']')
	}
	var raw []json.RawMessage
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}
	for _, r := range raw {
		for _, d := range digits.FindAllString(string(r), -1) {
			if n, err := strconv.Atoi(d); err == nil {
				*l = append(*l, n)
			}
		}
	}
	return nil
}

// FormatError means the model's reply could not be read as the requested JSON. Raw goes to the logs only.
type FormatError struct {
	Err error
	Raw string
}

func (e *FormatError) Error() string {
	return fmt.Sprintf("model output not decodable: %v (raw: %s)", e.Err, shorten(e.Raw, 500))
}

func (e *FormatError) Unwrap() error { return e.Err }

var fence = regexp.MustCompile("(?s)^```[a-zA-Z]*\\s*(.*?)\\s*```$")

// decodeModelJSON reads a JSON object from the model's text, tolerating a code fence or text around the object.
func decodeModelJSON(out string, v any) error {
	s := strings.TrimSpace(out)
	if m := fence.FindStringSubmatch(s); m != nil {
		s = m[1]
	}
	if i, j := strings.Index(s, "{"), strings.LastIndex(s, "}"); i > 0 || (j >= 0 && j < len(s)-1) {
		if i >= 0 && j > i {
			s = s[i : j+1]
		}
	}
	if err := json.Unmarshal([]byte(s), v); err != nil {
		var ute *json.UnmarshalTypeError
		if errors.As(err, &ute) {
			return &FormatError{Err: fmt.Errorf("field %q has the wrong type", ute.Field), Raw: out}
		}
		return &FormatError{Err: err, Raw: out}
	}
	return nil
}
