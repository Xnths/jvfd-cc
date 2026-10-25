package importer

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Xnths/jvfd-cc/backend/internal/richtext"
	"github.com/jackc/pgx/v5"
)

// serviceSeed is what the site hardcoded per service (SERVICE_CONFIG in ServicePage.tsx and the
// cards in content/clinic.ts). Mongo only has title, subtitle, SEO fields and the body.
type serviceSeed struct {
	Name, CardTitle, CardDescription, Icon, Layout, Theme, Badge, CTAText, WhatsApp string
	ShowOnHome, CampaignKey                                                         string
	ShowInFooter, ShowContact                                                       bool
	Sort                                                                            int
}

var serviceSeeds = map[string]serviceSeed{
	"psicoterapia": {
		Name: "Psicoterapia individual", CardTitle: "Quando lidar sozinho já não está funcionando",
		CardDescription: "A psicoterapia oferece um espaço de escuta ativa e sem julgamentos. Juntos, vamos compreender padrões que trazem sofrimento e construir novas formas de lidar com suas emoções e desafios.",
		Icon:            "brain", Layout: "calming", Theme: "teal", Badge: "Psicoterapia Individual", CTAText: "Agende uma primeira conversa",
		WhatsApp:   "Olá! Gostaria de agendar uma primeira conversa. Vi o site e gostaria de saber mais.",
		ShowOnHome: "always", ShowInFooter: true, ShowContact: true, Sort: 10,
	},
	"foco-organizacao": {
		Name: "Foco e organização", CardTitle: "Dificuldade de concentração e organização",
		CardDescription: "Se a rotina parece caótica ou o rendimento caiu, podemos desenvolver estratégias práticas e personalizadas para melhorar seu foco e gestão de tempo, respeitando seu ritmo.",
		Icon:            "target", Layout: "structured", Theme: "slate", Badge: "Foco & Organização", CTAText: "Recupere o controle da sua rotina",
		WhatsApp:   "Olá! Gostaria de saber mais sobre o atendimento para foco e organização.",
		ShowOnHome: "always", ShowInFooter: true, ShowContact: true, Sort: 20,
	},
	"plantao": {
		Name: "Plantão psicológico", CardTitle: "Acolhimento imediato para momentos difíceis",
		CardDescription: "Em momentos de grande angústia — como perdas significativas, separações ou inquietações intensas — o mais importante é não passar por isso sozinho. Ofereço suporte para estabilizar suas emoções e encontrar segurança.",
		Icon:            "life-buoy", Layout: "plantao", Theme: "green", Badge: "Plantão Psicológico", CTAText: "Fale comigo agora pelo WhatsApp",
		WhatsApp:   "Olá! Estou passando por um momento difícil e preciso de ajuda.",
		ShowOnHome: "always", ShowInFooter: true, ShowContact: false, Sort: 30,
	},
	"terapia-de-casal": {
		Name: "Terapia de casal", CardTitle: "Conflitos nos relacionamentos",
		CardDescription: "Problemas com parceiros ou família são comuns, mas desgastantes. Vamos trabalhar para melhorar a comunicação, estabelecer limites saudáveis e entender a dinâmica dessas relações.",
		Icon:            "users", Layout: "calming", Theme: "amber", Badge: "Terapia de Casal", CTAText: "Agende uma sessão para vocês",
		WhatsApp:   "Olá! Gostaria de agendar uma sessão de terapia de casal.",
		ShowOnHome: "always", ShowInFooter: true, ShowContact: true, Sort: 40,
	},
	"autoconhecimento": {
		Name: "Autoconhecimento e avaliação psicológica", CardTitle: "Autoconhecimento e entendimento",
		CardDescription: "Muitas vezes, não sabemos explicar o que sentimos. A avaliação psicológica ajuda a dar nome e sentido para suas angústias, sendo o primeiro passo para a mudança.",
		Icon:            "compass", Layout: "exploratory", Theme: "stone", Badge: "Autoconhecimento", CTAText: "Inicie sua jornada de autodescoberta",
		WhatsApp:   "Olá! Gostaria de começar um processo de autoconhecimento. Vi o site e quero saber mais.",
		ShowOnHome: "always", ShowInFooter: true, ShowContact: true, Sort: 50,
	},
	"supervisao": {
		Name: "Supervisão clínica para psicólogos", CardTitle: "Supervisão para psicólogos",
		CardDescription: "Para colegas de profissão, ofereço supervisão clínica em Análise do Comportamento, focada em discussão de casos, ética e aprimoramento técnico em parceria.",
		Icon:            "book-open", Layout: "supervisao", Theme: "slate_dark", Badge: "Supervisão Clínica", CTAText: "Solicite informações sobre a supervisão",
		WhatsApp:   "Olá! Sou psicólogo(a) e gostaria de solicitar informações sobre a supervisão clínica.",
		ShowOnHome: "always", ShowInFooter: true, ShowContact: true, Sort: 60,
	},
	"lgbtqia": {
		Name: "Psicólogo LGBTQIA+", CardTitle: "Psicólogo LGBTQIA+",
		CardDescription: "João é psicólogo gay e traz empatia genuína para o atendimento da comunidade LGBTQIA+. Juntos, trabalhamos rumo à aceitação, a relacionamentos mais plenos e a uma vida com mais alegria e autenticidade.",
		Icon:            "heart", Layout: "affirmative", Theme: "violet", Badge: "Psicólogo LGBTQIA+", CTAText: "Agendar uma conversa",
		WhatsApp:   "Olá! Gostaria de agendar uma sessão com o João. Vi o site e me interessei pelo atendimento LGBTQIA+.",
		ShowOnHome: "campaign", CampaignKey: "lgbt", ShowInFooter: false, ShowContact: true, Sort: 70,
	},
}

// importTreatments turns Payload treatments into a page + service pair, already published
// (they are live on the site today). Existing services are only overwritten with refresh.
func importTreatments(ctx context.Context, tx pgx.Tx, dir string, media map[string]string, refresh bool, rep *Report) error {
	items, err := load(dir, "treatments")
	if err != nil {
		return err
	}
	rep.Source["treatments"] = len(items)
	for _, t := range items {
		slug := str(t, "slug")
		seed, ok := serviceSeeds[slug]
		if !ok {
			// Unknown services still import, with neutral defaults.
			seed = serviceSeed{Name: str(t, "title"), CardTitle: str(t, "title"), Icon: "heart", Layout: "generic", Theme: "teal",
				CTAText: "Agendar pelo WhatsApp", WhatsApp: "Olá! Vi o site e gostaria de saber mais.", ShowOnHome: "always",
				ShowInFooter: true, ShowContact: true, Sort: 100}
			rep.note("treatment %q has no seed config: imported with the generic layout", slug)
		}
		content := t["content"]
		if miss := richtext.RewriteUploadIDs(content, media); len(miss) > 0 {
			rep.note("treatment %q: uploads without media row: %v", slug, miss)
		}
		richtext.NormalizeLinks(content, func(rel, id string) string { return "" })
		richtext.NodeTypes(content, rep.NodeHist)
		raw, _ := json.Marshal(content)

		published := date(t["updatedAt"])
		if published == nil {
			now := time.Now()
			published = &now
		}
		var pageID string
		var inserted bool
		err := tx.QueryRow(ctx, `
			INSERT INTO pages (slug, kind, title, subtitle, meta_title, meta_description, status, draft_version, published_version, published_at, legacy_id)
			VALUES ($1,'service',$2,$3,$4,$5,'published',1,1,$6,$7)
			ON CONFLICT (legacy_id) DO UPDATE SET
			    title = CASE WHEN $8 THEN EXCLUDED.title ELSE pages.title END,
			    subtitle = CASE WHEN $8 THEN EXCLUDED.subtitle ELSE pages.subtitle END,
			    meta_title = CASE WHEN $8 THEN EXCLUDED.meta_title ELSE pages.meta_title END,
			    meta_description = CASE WHEN $8 THEN EXCLUDED.meta_description ELSE pages.meta_description END
			RETURNING id::text, (xmax = 0)`,
			slug, str(t, "title"), str(t, "subtitle"), str(t, "metaTitle"), str(t, "metaDescription"), published, oid(t["_id"]), refresh).Scan(&pageID, &inserted)
		if err != nil {
			return fmt.Errorf("%s: %w", slug, err)
		}
		var campaign any
		if seed.CampaignKey != "" {
			campaign = seed.CampaignKey
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO services (page_id, name, card_title, card_description, icon, category, layout, theme, badge, cta_text, whatsapp_message,
			                      body, published_body, show_on_home, campaign_key, show_in_footer, show_contact_section, sort_order, analytics_key)
			VALUES ($1,$2,$3,$4,$5,'therapy',$6,$7,$8,$9,$10,$11::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17)
			ON CONFLICT (page_id) DO UPDATE SET
			    body = CASE WHEN $18 THEN EXCLUDED.body ELSE services.body END,
			    published_body = CASE WHEN $18 THEN EXCLUDED.published_body ELSE services.published_body END`,
			pageID, seed.Name, seed.CardTitle, seed.CardDescription, seed.Icon, seed.Layout, seed.Theme, seed.Badge, seed.CTAText, seed.WhatsApp,
			string(raw), seed.ShowOnHome, campaign, seed.ShowInFooter, seed.ShowContact, seed.Sort, "service_page_"+slug, refresh); err != nil {
			return fmt.Errorf("%s service: %w", slug, err)
		}
		count(rep, "services", inserted)
	}
	return nil
}
