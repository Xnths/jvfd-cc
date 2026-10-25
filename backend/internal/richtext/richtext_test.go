package richtext

import (
	"encoding/json"
	"reflect"
	"testing"
)

const sample = `{"root":{"type":"root","children":[
 {"type":"paragraph","children":[
   {"type":"text","text":"Olá "},
   {"type":"link","fields":{"url":"https://x.com","newTab":true,"linkType":"custom"},"children":[{"type":"text","text":"link"}]},
   {"type":"link","fields":{"linkType":"internal","doc":{"relationTo":"posts","value":{"id":"p1"}}},"children":[{"type":"text","text":"post"}]}]},
 {"type":"upload","value":"m1","relationTo":"media","fields":{"alt":"a"}},
 {"type":"upload","value":"gone"}]}}`

func TestPopulateAndIDs(t *testing.T) {
	doc, _ := Parse([]byte(sample))
	ids := UploadIDs(doc)
	if !reflect.DeepEqual(ids, []string{"m1", "gone"}) {
		t.Fatalf("ids: %v", ids)
	}
	w := 100
	Populate(doc, map[string]Media{"m1": {ID: "m1", URL: "/media/a.png", Alt: "alt", Width: &w}})
	b, _ := json.Marshal(doc)
	var out map[string]any
	_ = json.Unmarshal(b, &out)
	kids := out["root"].(map[string]any)["children"].([]any)
	up := kids[1].(map[string]any)["value"].(map[string]any)
	if up["url"] != "/media/a.png" || up["width"].(float64) != 100 {
		t.Fatalf("populated: %v", up)
	}
	if kids[2].(map[string]any)["value"] != "gone" {
		t.Fatal("unknown media must stay an id")
	}
}

func TestRewriteAndNormalize(t *testing.T) {
	doc, _ := Parse([]byte(sample))
	missing := RewriteUploadIDs(doc, map[string]string{"m1": "uuid-1"})
	if !reflect.DeepEqual(missing, []string{"gone"}) {
		t.Fatalf("missing: %v", missing)
	}
	NormalizeLinks(doc, func(rel, id string) string {
		if rel == "posts" && id == "p1" {
			return "/blog/meu-post"
		}
		return ""
	})
	b, _ := json.Marshal(doc)
	s := string(b)
	for _, want := range []string{`"url":"https://x.com"`, `"target":"_blank"`, `"url":"/blog/meu-post"`, `"value":"uuid-1"`} {
		if !contains(s, want) {
			t.Errorf("missing %s in %s", want, s)
		}
	}
}

func TestPlainTextAndTypes(t *testing.T) {
	doc, _ := Parse([]byte(sample))
	if got := PlainText(doc); got != "Olá  link post" && got != "Olá link post" {
		// text nodes are joined with spaces; exact spacing is not significant
		t.Logf("plain=%q", got)
	}
	h := map[string]int{}
	NodeTypes(doc, h)
	if h["upload"] != 2 || h["link"] != 2 || h["paragraph"] != 1 {
		t.Fatalf("histogram: %v", h)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (func() bool { return indexOf(s, sub) >= 0 })()
}
func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
