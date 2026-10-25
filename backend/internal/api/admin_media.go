package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/httpx"
	"github.com/Xnths/jvfd-cc/backend/internal/richtext"
	_ "golang.org/x/image/webp"
)

const maxUpload = 10 << 20

// sniffImage accepts only raster formats. SVG is refused on purpose: it can carry scripts.
func sniffImage(b []byte) (mime, ext string, ok bool) {
	switch ct := http.DetectContentType(b); ct {
	case "image/jpeg":
		return ct, ".jpg", true
	case "image/png":
		return ct, ".png", true
	case "image/gif":
		return ct, ".gif", true
	case "image/webp":
		return ct, ".webp", true
	}
	if len(b) > 12 && string(b[4:8]) == "ftyp" && (string(b[8:12]) == "avif" || string(b[8:12]) == "avis") {
		return "image/avif", ".avif", true
	}
	return "", "", false
}

// stripJPEGMetadata removes EXIF (APP1) and other APPn metadata segments other than JFIF/ICC,
// so uploaded photos don't leak GPS position or device details.
func stripJPEGMetadata(b []byte) []byte {
	if len(b) < 4 || b[0] != 0xFF || b[1] != 0xD8 {
		return b
	}
	out := bytes.NewBuffer(make([]byte, 0, len(b)))
	out.Write(b[:2])
	i := 2
	for i+4 <= len(b) {
		if b[i] != 0xFF {
			break
		}
		marker := b[i+1]
		if marker == 0xDA || marker == 0xD9 { // start of scan: the rest is image data
			break
		}
		segLen := int(b[i+2])<<8 | int(b[i+3])
		if segLen < 2 || i+2+segLen > len(b) {
			return b // malformed: leave untouched rather than corrupt
		}
		seg := b[i : i+2+segLen]
		drop := false
		switch {
		case marker == 0xE1: // EXIF / XMP
			drop = true
		case marker >= 0xE3 && marker <= 0xEF: // other application metadata (APP3..APP15)
			drop = true
		case marker == 0xFE: // comment
			drop = true
		}
		if !drop {
			out.Write(seg)
		}
		i += 2 + segLen
	}
	out.Write(b[i:])
	return out.Bytes()
}

func (s *Server) adminListMedia(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text, filename, mime_type, filesize, width, height, alt, caption, created_at FROM media ORDER BY created_at DESC LIMIT 500`)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, fn, mime, alt, caption string
		var size int64
		var wd, ht *int
		var at time.Time
		if err := rows.Scan(&id, &fn, &mime, &size, &wd, &ht, &alt, &caption, &at); err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		out = append(out, map[string]any{"id": id, "filename": fn, "url": richtext.MediaURL(fn), "mimeType": mime, "filesize": size,
			"width": wd, "height": ht, "alt": alt, "caption": caption, "createdAt": at})
	}
	httpx.JSON(w, 200, map[string]any{"media": out})
}

func (s *Server) adminUploadMedia(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload+(1<<20))
	if err := r.ParseMultipartForm(maxUpload); err != nil {
		badRequest(w, "upload too large or malformed (max 10 MB)")
		return
	}
	alt := strings.TrimSpace(r.FormValue("alt"))
	if alt == "" {
		badRequest(w, "alt text is required (accessibility and SEO)")
		return
	}
	f, _, err := r.FormFile("file")
	if err != nil {
		badRequest(w, "file is required")
		return
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, maxUpload+1))
	if err != nil || len(data) > maxUpload {
		badRequest(w, "file too large (max 10 MB)")
		return
	}
	mime, ext, ok := sniffImage(data)
	if !ok {
		badRequest(w, "only JPEG, PNG, GIF, WebP and AVIF images are accepted")
		return
	}
	if mime == "image/jpeg" {
		data = stripJPEGMetadata(data)
	}
	var wd, ht *int
	if cfg, _, err := image.DecodeConfig(bytes.NewReader(data)); err == nil {
		wd, ht = &cfg.Width, &cfg.Height
		if cfg.Width > 12000 || cfg.Height > 12000 {
			badRequest(w, "image dimensions too large")
			return
		}
	} else if mime != "image/avif" {
		badRequest(w, "could not read the image")
		return
	}
	sum := sha256.Sum256(data)
	hash := hex.EncodeToString(sum[:])
	filename := hash[:20] + ext

	if err := os.MkdirAll(s.Cfg.MediaDir, 0o755); err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	dest := filepath.Join(s.Cfg.MediaDir, filename)
	if _, err := os.Stat(dest); errors.Is(err, os.ErrNotExist) {
		tmp, err := os.CreateTemp(s.Cfg.MediaDir, ".upload-*")
		if err != nil {
			serverError(w, s.Log, r, err)
			return
		}
		_, werr := tmp.Write(data)
		cerr := tmp.Close()
		if werr != nil || cerr != nil || os.Chmod(tmp.Name(), 0o644) != nil || os.Rename(tmp.Name(), dest) != nil {
			os.Remove(tmp.Name())
			serverError(w, s.Log, r, errors.Join(werr, cerr))
			return
		}
	}
	var id string
	err = s.Pool.QueryRow(r.Context(), `INSERT INTO media (filename, mime_type, filesize, width, height, alt, caption, sha256, uploaded_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::uuid)
		ON CONFLICT (filename) DO UPDATE SET alt = EXCLUDED.alt, updated_at = now() RETURNING id::text`,
		filename, mime, int64(len(data)), wd, ht, alt, strings.TrimSpace(r.FormValue("caption")), hash, s.actorID(r)).Scan(&id)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	s.audit(r, "media.upload", "media", id, map[string]any{"filename": filename})
	httpx.JSON(w, http.StatusCreated, map[string]any{"id": id, "filename": filename, "url": richtext.MediaURL(filename), "width": wd, "height": ht})
}

func (s *Server) adminPatchMedia(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Alt     *string `json:"alt"`
		Caption *string `json:"caption"`
	}
	if !decode(w, r, &in, 4096) {
		return
	}
	if in.Alt != nil && strings.TrimSpace(*in.Alt) == "" {
		badRequest(w, "alt text cannot be empty")
		return
	}
	tag, err := s.Pool.Exec(r.Context(), `UPDATE media SET alt = coalesce($2, alt), caption = coalesce($3, caption), updated_at = now() WHERE id::text = $1`, r.PathValue("id"), in.Alt, in.Caption)
	if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	if tag.RowsAffected() == 0 {
		notFound(w)
		return
	}
	s.Notify.Revalidate(r.Context(), []string{tagPosts, tagPages, tagServices, tagProfiles}, nil, false)
	w.WriteHeader(http.StatusNoContent)
}

// mediaInUse reports whether a media id is referenced by a column or by an upload node in any document.
func (s *Server) mediaInUse(r *http.Request, id string) (bool, error) {
	var used bool
	err := s.Pool.QueryRow(r.Context(), `SELECT
		EXISTS (SELECT 1 FROM posts WHERE image_id::text = $1 OR position($1 in content::text) > 0 OR position($1 in coalesce(published_content::text,'')) > 0)
		OR EXISTS (SELECT 1 FROM profiles WHERE photo_id::text = $1 OR position($1 in coalesce(bio::text,'')) > 0)
		OR EXISTS (SELECT 1 FROM pages WHERE position($1 in draft_blocks::text) > 0 OR position($1 in published_blocks::text) > 0)
		OR EXISTS (SELECT 1 FROM services WHERE position($1 in coalesce(body::text,'')) > 0 OR position($1 in coalesce(published_body::text,'')) > 0)
		OR EXISTS (SELECT 1 FROM glossary_terms WHERE position($1 in coalesce(body::text,'')) > 0)
		OR EXISTS (SELECT 1 FROM site_settings WHERE position($1 in draft::text) > 0 OR position($1 in published::text) > 0)`, id).Scan(&used)
	return used, err
}

func (s *Server) adminDeleteMedia(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	used, err := s.mediaInUse(r, id)
	if err != nil {
		badRequest(w, "invalid id")
		return
	}
	if used {
		httpx.Problem(w, http.StatusConflict, "this image is still used by a post, page or profile")
		return
	}
	var filename string
	if err := s.Pool.QueryRow(r.Context(), `DELETE FROM media WHERE id::text = $1 RETURNING filename`, id).Scan(&filename); isNoRows(err) {
		notFound(w)
		return
	} else if err != nil {
		serverError(w, s.Log, r, err)
		return
	}
	// The same bytes may be referenced by another row; only remove the file when none is left.
	var others int
	_ = s.Pool.QueryRow(r.Context(), `SELECT count(*) FROM media WHERE filename = $1`, filename).Scan(&others)
	if others == 0 {
		_ = os.Remove(filepath.Join(s.Cfg.MediaDir, filepath.Base(filename)))
	}
	s.audit(r, "media.delete", "media", id, map[string]any{"filename": filename})
	w.WriteHeader(http.StatusNoContent)
}
