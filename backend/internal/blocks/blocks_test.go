package blocks

import (
	"encoding/json"
	"strings"
	"testing"
)

func home(extra ...string) json.RawMessage {
	bs := []string{
		`{"id":"a","type":"services_grid","anchor":"services","data":{}}`,
		`{"id":"b","type":"text_with_image","anchor":"about","data":{}}`,
		`{"id":"c","type":"faq","anchor":"faq","data":{}}`,
		`{"id":"d","type":"contact","anchor":"contact","data":{}}`,
	}
	return json.RawMessage("[" + strings.Join(append(bs, extra...), ",") + "]")
}

func TestValidate(t *testing.T) {
	if err := Validate("home", home()); err != nil {
		t.Fatalf("valid home rejected: %v", err)
	}
	cases := map[string]json.RawMessage{
		"missing locked anchor": json.RawMessage(`[{"id":"a","type":"hero","data":{}}]`),
		"unknown type":          home(`{"id":"x","type":"marquee","data":{}}`),
		"duplicate id":          home(`{"id":"a","type":"hero","data":{}}`),
		"duplicate anchor":      home(`{"id":"x","type":"hero","anchor":"faq","data":{}}`),
		"bad anchor":            home(`{"id":"x","type":"hero","anchor":"Bad Anchor","data":{}}`),
		"data not object":       home(`{"id":"x","type":"hero","data":[]}`),
		"bad visibility":        home(`{"id":"x","type":"hero","visibility":{"campaign":"lgbt"},"data":{}}`),
		"not a list":            json.RawMessage(`{"a":1}`),
	}
	for name, raw := range cases {
		if Validate("home", raw) == nil {
			t.Errorf("%s: expected error", name)
		}
	}
	// Other page kinds don't need the home anchors.
	if err := Validate("custom", json.RawMessage(`[{"id":"x","type":"rich_text","data":{}}]`)); err != nil {
		t.Errorf("custom page rejected: %v", err)
	}
	if err := Validate("home", home(`{"id":"x","type":"hero","visibility":{"campaign":"lgbt","mode":"only"},"data":{}}`)); err != nil {
		t.Errorf("campaign visibility rejected: %v", err)
	}
}
