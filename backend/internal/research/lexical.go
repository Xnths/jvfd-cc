package research

import (
	"encoding/json"
	"regexp"
	"strings"
)

type node = map[string]any

func text(s string, bold bool) node {
	f := 0
	if bold {
		f = 1
	}
	return node{"type": "text", "version": 1, "text": s, "format": f, "mode": "normal", "style": "", "detail": 0}
}

func paragraph(children ...node) node {
	c := make([]any, len(children))
	for i, n := range children {
		c[i] = n
	}
	return node{"type": "paragraph", "version": 1, "format": "", "indent": 0, "direction": nil, "children": c}
}

func heading(tag, s string) node {
	return node{"type": "heading", "tag": tag, "version": 1, "format": "", "indent": 0, "direction": nil, "children": []any{text(s, false)}}
}

func link(label, url string) node {
	return node{"type": "link", "version": 1, "format": "", "indent": 0, "direction": nil, "url": url, "target": "_blank", "rel": "noopener noreferrer", "children": []any{text(label, false)}}
}

func doc(blocks ...node) []byte {
	c := make([]any, len(blocks))
	for i, b := range blocks {
		c[i] = b
	}
	b, _ := json.Marshal(node{"root": node{"type": "root", "version": 1, "format": "", "indent": 0, "direction": nil, "children": c}})
	return b
}

// list is a Lexical bullet or numbered list.
func list(items []string, ordered bool) node {
	lt, tag := "bullet", "ul"
	if ordered {
		lt, tag = "number", "ol"
	}
	c := make([]any, len(items))
	for i, it := range items {
		c[i] = node{"type": "listitem", "value": i + 1, "version": 1, "format": "", "indent": 0, "direction": nil, "children": richText(it)}
	}
	return node{"type": "list", "listType": lt, "tag": tag, "start": 1, "version": 1, "format": "", "indent": 0, "direction": nil, "children": c}
}

var boldRe = regexp.MustCompile(`\*\*(.+?)\*\*`)

// richText turns **bold** spans into bold text nodes.
func richText(s string) []any {
	var out []any
	last := 0
	for _, m := range boldRe.FindAllStringSubmatchIndex(s, -1) {
		if m[0] > last {
			out = append(out, text(s[last:m[0]], false))
		}
		out = append(out, text(s[m[2]:m[3]], true))
		last = m[1]
	}
	if last < len(s) {
		out = append(out, text(s[last:], false))
	}
	if len(out) == 0 {
		out = append(out, text("", false))
	}
	return out
}

func richParagraph(s string) node {
	return node{"type": "paragraph", "version": 1, "format": "", "indent": 0, "direction": nil, "children": richText(strings.TrimSpace(s))}
}
