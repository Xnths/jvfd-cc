// Package blocks validates the ordered, typed blocks that make up a page.
package blocks

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
)

// Types is the registry of block types the renderer knows about.
var Types = map[string]bool{
	"hero": true, "social_follow": true, "latest_posts": true, "newsletter_signup": true, "services_grid": true,
	"testimonials": true, "text_with_image": true, "credentials_grid": true, "faq": true, "contact": true,
	"feature_cards": true, "location_map": true, "cta_band": true, "track_cards": true, "steps": true,
	"rich_text": true, "profile_card": true, "tool_embed": true,
}

// LockedAnchors must exist on the home page and cannot be removed: ad campaigns and
// in-page navigation depend on #services, #about, #faq and #contact.
var LockedAnchors = []string{"services", "about", "faq", "contact"}

const maxBlockBytes = 256 << 10

var anchorPattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,40}$`)

// Block is the common envelope of every block.
type Block struct {
	ID         string          `json:"id"`
	Type       string          `json:"type"`
	Anchor     string          `json:"anchor,omitempty"`
	Visibility *Visibility     `json:"visibility,omitempty"`
	Data       json.RawMessage `json:"data"`
}

// Visibility restricts a block to (or hides it from) a campaign variant of the page.
type Visibility struct {
	Campaign string `json:"campaign,omitempty"`
	Mode     string `json:"mode,omitempty"` // only | hide
}

// Validate checks a block list for the given page kind and returns a user-facing error.
func Validate(kind string, raw json.RawMessage) error {
	var list []Block
	if err := json.Unmarshal(raw, &list); err != nil {
		return errors.New("blocks must be a list of objects")
	}
	ids := map[string]bool{}
	anchors := map[string]bool{}
	for i, b := range list {
		if b.ID == "" || len(b.ID) > 64 {
			return fmt.Errorf("block %d: id is required", i+1)
		}
		if ids[b.ID] {
			return fmt.Errorf("block %d: duplicate id %q", i+1, b.ID)
		}
		ids[b.ID] = true
		if !Types[b.Type] {
			return fmt.Errorf("block %d: unknown type %q", i+1, b.Type)
		}
		if b.Anchor != "" {
			if !anchorPattern.MatchString(b.Anchor) {
				return fmt.Errorf("block %d: invalid anchor %q", i+1, b.Anchor)
			}
			if anchors[b.Anchor] {
				return fmt.Errorf("block %d: duplicate anchor %q", i+1, b.Anchor)
			}
			anchors[b.Anchor] = true
		}
		if len(b.Data) == 0 || b.Data[0] != '{' {
			return fmt.Errorf("block %d: data must be an object", i+1)
		}
		if len(b.Data) > maxBlockBytes {
			return fmt.Errorf("block %d: too large", i+1)
		}
		if v := b.Visibility; v != nil && v.Campaign != "" && v.Mode != "only" && v.Mode != "hide" {
			return fmt.Errorf("block %d: visibility.mode must be only or hide", i+1)
		}
	}
	if kind == "home" {
		for _, a := range LockedAnchors {
			if !anchors[a] {
				return fmt.Errorf("the home page must keep its #%s section", a)
			}
		}
	}
	return nil
}
