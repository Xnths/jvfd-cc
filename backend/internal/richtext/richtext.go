// Package richtext works on Lexical JSON documents as stored by the CMS. Documents are kept as
// generic maps so unknown node types survive a round trip untouched.
package richtext

import (
	"encoding/json"
	"strings"
)

// Media is the populated form of an upload node's value, matching what the Next.js
// renderers (RichText.tsx, markdown.ts) read: url, alt, width, height.
type Media struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	Filename string `json:"filename"`
	Alt      string `json:"alt"`
	MimeType string `json:"mimeType"`
	Width    *int   `json:"width"`
	Height   *int   `json:"height"`
}

// MediaURL is the public URL of an uploaded file.
func MediaURL(filename string) string { return "/media/" + filename }

// UploadIDs returns the media ids referenced by upload nodes (string values only).
func UploadIDs(doc any) []string {
	seen := map[string]bool{}
	var out []string
	walk(doc, func(n map[string]any) {
		if n["type"] == "upload" {
			if id, ok := n["value"].(string); ok && id != "" && !seen[id] {
				seen[id] = true
				out = append(out, id)
			}
		}
	})
	return out
}

// Populate replaces upload node ids with media objects (a no-op for ids it has no media for,
// and for nodes that are already populated). It mutates doc in place.
func Populate(doc any, media map[string]Media) {
	walk(doc, func(n map[string]any) {
		if n["type"] != "upload" {
			return
		}
		if id, ok := n["value"].(string); ok {
			if m, found := media[id]; found {
				n["value"] = m
			}
		}
	})
}

// RewriteUploadIDs maps legacy ids to new ids inside upload nodes (used by the Payload importer).
func RewriteUploadIDs(doc any, mapping map[string]string) (missing []string) {
	walk(doc, func(n map[string]any) {
		if n["type"] != "upload" {
			return
		}
		switch v := n["value"].(type) {
		case string:
			if to, ok := mapping[v]; ok {
				n["value"] = to
			} else {
				missing = append(missing, v)
			}
		case map[string]any: // Payload exports populated docs sometimes
			if id, ok := v["id"].(string); ok {
				if to, ok := mapping[id]; ok {
					n["value"] = to
				} else {
					missing = append(missing, id)
				}
			}
		}
	})
	return missing
}

// NormalizeLinks converts Payload link nodes (fields.url / fields.newTab) into the standard
// Lexical shape (url, target, rel), resolving internal document links with resolve (which
// returns "" when the target is unknown).
func NormalizeLinks(doc any, resolve func(relationTo, id string) string) {
	walk(doc, func(n map[string]any) {
		t, _ := n["type"].(string)
		if t != "link" && t != "autolink" {
			return
		}
		fields, _ := n["fields"].(map[string]any)
		url, _ := n["url"].(string)
		newTab := false
		if fields != nil {
			if u, ok := fields["url"].(string); ok && u != "" {
				url = u
			}
			newTab, _ = fields["newTab"].(bool)
			if lt, _ := fields["linkType"].(string); lt == "internal" {
				if doc, ok := fields["doc"].(map[string]any); ok {
					rel, _ := doc["relationTo"].(string)
					id := ""
					switch v := doc["value"].(type) {
					case string:
						id = v
					case map[string]any:
						id, _ = v["id"].(string)
					}
					if resolve != nil {
						if p := resolve(rel, id); p != "" {
							url = p
						}
					}
				}
			}
		}
		n["url"] = url
		if newTab {
			n["target"] = "_blank"
			n["rel"] = "noopener noreferrer"
		}
	})
}

// NodeTypes counts node types in a document (a histogram used to check the editor supports
// everything the importer brought in).
func NodeTypes(doc any, into map[string]int) {
	walk(doc, func(n map[string]any) {
		if t, ok := n["type"].(string); ok {
			into[t]++
		}
	})
}

// PlainText concatenates all text nodes (used for excerpts, lint and search).
func PlainText(doc any) string {
	var b strings.Builder
	walk(doc, func(n map[string]any) {
		if n["type"] == "text" {
			if s, ok := n["text"].(string); ok {
				b.WriteString(s)
				b.WriteByte(' ')
			}
		}
	})
	return strings.TrimSpace(b.String())
}

// Parse decodes raw JSON into a generic value; empty input yields nil.
func Parse(raw []byte) (any, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var v any
	err := json.Unmarshal(raw, &v)
	return v, err
}

// walk visits every JSON object in the tree, parents before children.
func walk(v any, fn func(map[string]any)) {
	switch x := v.(type) {
	case map[string]any:
		fn(x)
		for _, c := range x {
			walk(c, fn)
		}
	case []any:
		for _, c := range x {
			walk(c, fn)
		}
	}
}
