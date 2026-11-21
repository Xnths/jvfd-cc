import {
    SITE_URL,
    contact,
    faq,
    formatAddress,
    links,
    person,
    presencial,
    qualifications,
    services,
    whatsappLink,
} from "@/content/clinic";
import { tutoring } from "@/content/tutoring";
import { serviceLandings, faqDisplay } from "@/content/service-landings";
import { AVALIACAO_PATH, AVALIACAO_WHATSAPP_MESSAGE, SUBPAGE, conditionPath, conditions, type Condition } from "@/content/avaliacoes";
import { credentials } from "@/content/credentials";
import type { AnsweredQuestion, GlossaryItem, GlossaryTerm, PostDoc, ProfileDoc, TreatmentDoc } from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";

/* eslint-disable @typescript-eslint/no-explicit-any */

function inline(node: any): string {
    if (node.text !== undefined) {
        let t: string = node.text;
        if (!t) return "";
        if (node.format & 1) t = `**${t}**`;
        if (node.format & 2) t = `*${t}*`;
        return t;
    }
    if (node.type === "linebreak") return "\n";
    if (node.type === "link" || node.type === "autolink") {
        const url: string = node.fields?.url ?? node.url ?? "";
        const text = (node.children ?? []).map(inline).join("");
        return url ? `[${text}](${url.startsWith("/") ? absoluteUrl(url) : url})` : text;
    }
    return (node.children ?? []).map(inline).join("");
}

function block(node: any, depth = 0): string {
    switch (node.type) {
        case "paragraph":
            return (node.children ?? []).map(inline).join("");
        case "heading": {
            const level = Math.min(6, Number(String(node.tag).replace("h", "")) + 1 || 3);
            return `${"#".repeat(level)} ${(node.children ?? []).map(inline).join("")}`;
        }
        case "quote":
            return (node.children ?? []).map(inline).join("").split("\n").map((l: string) => `> ${l}`).join("\n");
        case "horizontalrule":
            return "---";
        case "list":
            return (node.children ?? [])
                .map((item: any, i: number) => {
                    const marker = node.listType === "number" ? `${i + 1}.` : "-";
                    const text = (item.children ?? [])
                        .map((c: any) => (c.type === "list" ? "\n" + block(c, depth + 1) : inline(c)))
                        .join("");
                    return `${"  ".repeat(depth)}${marker} ${text}`;
                })
                .join("\n");
        case "upload":
            return node.value?.url
                ? `![${node.value.alt ?? ""}](${new URL(node.value.url, SITE_URL).toString()})`
                : "";
        default:
            return (node.children ?? []).map(inline).join("");
    }
}

/** Serializes a Payload Lexical document to Markdown (headings shifted down one level). */
export function lexicalToMarkdown(content: any): string {
    const children = content?.root?.children;
    if (!Array.isArray(children)) return "";
    return children.map((n: any) => block(n)).filter(Boolean).join("\n\n");
}

/** Services that are never done by video. Everything else is offered online and in person. */
const PRESENCIAL_ONLY = new Set(["avaliacao-neuropsicologica"]);

const bookingFooter = ({ whatsapp, presencialOnly }: { whatsapp?: string; presencialOnly?: boolean } = {}) => `---

## Como agendar

- WhatsApp: ${whatsappLink(whatsapp || "Olá, João! Vi seu site e gostaria de saber mais sobre a terapia.")}
- E-mail: ${contact.email}
- ${presencialOnly ? "Atendimento somente presencial" : "Atendimento online (videochamada, todo o Brasil) e presencial"}: ${formatAddress()}
- Horário: ${contact.hours.daysLabel}, ${contact.hours.opens} às ${contact.hours.closes}
- Profissional: ${person.name}, psicólogo, CRP ${person.crp}`;

const header = (title: string, path: string, updated?: string) =>
    `# ${title}\n\n> Fonte: ${absoluteUrl(path)}${updated ? ` · Atualizado em ${updated.slice(0, 10)}` : ""}\n`;

export function profileMarkdown() {
    return `## Sobre ${person.shortName}

${person.name} é psicólogo clínico (CRP ${person.crp}), com prática profissional desde ${person.practicingSince} e atuação fundamentada em ${person.approach}. Atende pessoas adultas em psicoterapia, online para todo o Brasil e presencialmente na Vila Madalena, em São Paulo. Realiza avaliação neuropsicológica com adultos e crianças, somente presencial. É psicólogo gay e atende de forma afirmativa a comunidade LGBTQIA+.

### Formação
${qualifications.map((q) => `- ${q.title} — ${q.institution}`).join("\n")}

Currículo Lattes: ${links.lattes}`;
}

export function homeMarkdown(posts: PostDoc[]) {
    return `${header("Psicólogo João Fernandes — Terapia Comportamental Online e Presencial", "/")}
${profileMarkdown()}

## Atendimentos

${services.map((s) => `- [${s.name}](${absoluteUrl(s.href)}): ${s.description}`).join("\n")}
- [${tutoring.shortName}](${absoluteUrl(tutoring.path)}): ${tutoring.description}

## Perguntas frequentes

${faq.map((f) => `**${f.question}**\n${f.answer}`).join("\n\n")}

## Artigos recentes

${posts.slice(0, 10).map((p) => `- [${p.title}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.excerpt}`).join("\n") || "(nenhum)"}

${bookingFooter()}`;
}

export function treatmentMarkdown(t: TreatmentDoc) {
    const landing = serviceLandings[t.slug];
    // Crisis pages open with the emergency numbers, here as on the HTML page.
    const safety = landing?.safety
        ? `**${landing.safety.title}** ${landing.safety.text} ${landing.safety.actions.map((a) => `${a.label} (${a.detail})`).join(" · ")}\n\n`
        : "";
    const before = landing
        ? `${landing.hero.facts ? landing.hero.facts.map((f) => `- ${f}`).join("\n") + "\n\n" : ""}${landing.hero.credentials ? credentialsMarkdown() + "\n\n" : ""}${landing.hero.note}\n\n## ${landing.when.title}\n\n${landing.when.intro}\n\n${landing.when.groups
              .map((g, gi) =>
                  landing.when.cards
                      ? `### ${g.title}\n\n${g.text}\n\n${conditions
                            .filter((c) => c.group === gi)
                            .map((c) => `- [${c.card.title}](${absoluteUrl(conditionPath(c.slug))}): ${c.card.description} (${c.tags.join(", ")})`)
                            .join("\n")}`
                      : `### ${g.title}\n\n${g.text}\n\n${g.items.map((i) => `- ${i}`).join("\n")}`,
              )
              .join("\n\n")}\n\n`
        : "";
    const after = landing
        ? `\n\n## ${landing.steps.title}\n\n${landing.steps.items.map((s, i) => `${i + 1}. **${s.title}:** ${s.text}`).join("\n")}
${landing.deliverables ? `\n## ${landing.deliverables.title}\n\n${landing.deliverables.items.map((d) => `- **${d.title}:** ${d.text}`).join("\n")}\n` : ""}
## ${landing.research.title}

${landing.research.findings.map((f) => `- ${f.text} [${f.refs.join(", ")}]`).join("\n")}

${landing.research.caveat}

## ${landing.about.title}

${landing.about.approach ? `${landing.about.role ?? ""}\n\n${credentialsMarkdown()}\n\n${landing.about.approach}` : landing.about.text}

## ${landing.faqTitle}

${faqDisplay(landing.faq).map(({ item: f }) => `**${f.question}**\n${f.answer}`).join("\n\n")}

## ${landing.referencesTitle}

${landing.references.map((r) => `${r.n}. ${r.text}${r.doi ? ` https://doi.org/${r.doi}` : ""}`).join("\n")}\n`
        : "";
    return `${safety}${header(t.title, `/${t.slug}`, t.updatedAt)}
${t.subtitle ? `**${t.subtitle}**\n\n` : ""}${before}${lexicalToMarkdown(t.content)}${after}
${bookingFooter({ whatsapp: t.service?.whatsappMessage, presencialOnly: PRESENCIAL_ONLY.has(t.slug) })}`;
}

const INFORMATIVE = "Texto informativo, sem caráter de atendimento. Em crise, ligue 188 (CVV) ou 192 (SAMU).";

export function glossaryIndexMarkdown(terms: GlossaryItem[]) {
    return `${header("Glossário de psicologia e Análise do Comportamento", "/glossario")}
${terms.map((t) => `- [${t.term}](${absoluteUrl(`/glossario/${t.slug}`)}): ${t.shortDefinition}`).join("\n") || "(nenhum termo publicado)"}

${INFORMATIVE}`;
}

export function glossaryTermMarkdown(t: GlossaryTerm) {
    const sources: string[] = Array.isArray(t.sources) ? t.sources : [];
    return `${header(t.term, `/glossario/${t.slug}`, t.updatedAt)}
${t.altNames.length ? `Também chamado de: ${t.altNames.join(", ")}\n\n` : ""}**${t.shortDefinition}**

${lexicalToMarkdown(t.body)}
${sources.length ? `\n## Referências\n\n${sources.map((s) => `- ${s}`).join("\n")}\n` : ""}
${INFORMATIVE}`;
}

export function questionMarkdown(q: AnsweredQuestion) {
    return `${header(q.question, `/perguntas/${q.slug}`, q.publishedAt ?? undefined)}
${lexicalToMarkdown(q.answer)}

${INFORMATIVE}`;
}

export function questionsIndexMarkdown(questions: AnsweredQuestion[]) {
    return `${header("Perguntas e respostas sobre psicologia e terapia", "/perguntas")}
${questions.map((q) => `## ${q.question}\n\n${lexicalToMarkdown(q.answer)}${q.slug ? `\n\nFonte: ${absoluteUrl(`/perguntas/${q.slug}`)}` : ""}`).join("\n\n") || "(nenhuma pergunta respondida)"}

${INFORMATIVE}`;
}

export function profilesIndexMarkdown(profiles: ProfileDoc[]) {
    return `${header("Quem somos", "/sobre")}
${profiles.map((p) => `- [${p.displayName}](${absoluteUrl(`/sobre/${p.slug}`)}): ${p.jobTitle}${p.crp ? `, CRP ${p.crp}` : ""}`).join("\n") || "(nenhum perfil público)"}`;
}

export function profileDocMarkdown(p: ProfileDoc) {
    const sections = (p.sections ?? [])
        .filter((s) => s.entries.length)
        .map((s) => `## ${s.title}\n\n${s.entries.map((e) => `- ${e.title}${e.organization ? ` — ${e.organization}` : ""}`).join("\n")}`)
        .join("\n\n");
    const profileLinks = Object.values(p.links ?? {}).filter(Boolean);
    return `${header(p.fullName || p.displayName, `/sobre/${p.slug}`, p.updatedAt)}
${p.jobTitle}${p.crp ? `, CRP ${p.crp}` : ""}.${p.approach ? ` ${p.approach}.` : ""}${p.practicingSince ? ` Prática profissional desde ${p.practicingSince}.` : ""}

${lexicalToMarkdown(p.bio)}

${sections}
${profileLinks.length ? `\n## Links\n\n${profileLinks.map((l) => `- ${l}`).join("\n")}\n` : ""}
${bookingFooter()}`;
}

export function postMarkdown(p: PostDoc) {
    return `${header(p.title, `/blog/${p.slug}`, p.updatedAt)}
Por ${p.author || person.name} · Publicado em ${p.publishedDate.slice(0, 10)}

${p.excerpt}

${lexicalToMarkdown(p.content)}

${bookingFooter()}`;
}

export function blogIndexMarkdown(posts: PostDoc[]) {
    return `${header("Blog do Psicólogo João Fernandes", "/blog")}
${posts.map((p) => `- [${p.title}](${absoluteUrl(`/blog/${p.slug}`)}) (${p.publishedDate.slice(0, 10)}): ${p.excerpt}`).join("\n") || "(nenhum artigo publicado)"}

${bookingFooter()}`;
}

export function presencialMarkdown() {
    return `${header("Psicólogo presencial na Vila Madalena, SP", "/presencial")}
Consultório em ${formatAddress()}.

## Como chegar
${presencial.transit.map((t) => `- **${t.label}:** ${t.detail}`).join("\n")}

Mapa: ${links.googleProfile}

${bookingFooter()}`;
}

export function tutoringMarkdown() {
    return `${header(tutoring.title, tutoring.path)}
${tutoring.description}

${tutoring.tracks.map((t) => `## ${t.title}\n\n${t.description}\n\n${t.topics.map((x) => `- ${x}`).join("\n")}`).join("\n\n")}

## Como funciona
${tutoring.howItWorks.map((s, i) => `${i + 1}. **${s.title}:** ${s.description}`).join("\n")}

## Perguntas frequentes
${tutoring.faq.map((f) => `**${f.question}**\n${f.answer}`).join("\n\n")}

- WhatsApp: ${whatsappLink(tutoring.whatsappMessage)}`;
}

function credentialsMarkdown() {
    return credentials.map((c) => `- ${c.title} — ${c.institution}`).join("\n");
}

/** Markdown twin of /avaliacao-neuropsicologica/<slug> (code defaults, like treatmentMarkdown). */
export function conditionMarkdown(c: Condition) {
    const path = conditionPath(c.slug);
    return `${header(`${SUBPAGE.h1Prefix} ${c.h1}`, path)}
**${c.lead}**

${person.name}, psicólogo, CRP ${person.crp}.

${credentialsMarkdown()}

${SUBPAGE.note}

## ${SUBPAGE.whatIsTitle}

${c.whatIs.join("\n\n")}

## ${SUBPAGE.signsTitle}

${c.signs.map((x) => `- ${x}`).join("\n")}

${SUBPAGE.signsNote}

## ${SUBPAGE.investigatesTitle}

${c.investigatesIntro ? `${c.investigatesIntro}\n\n` : ""}${c.investigates.map((f) => `- **${f.fn}:** ${f.text}`).join("\n")}

${SUBPAGE.investigatesNote}

## ${SUBPAGE.helpsTitle}

${c.helps.map((x) => `- ${x}`).join("\n")}
${c.crisisLine ? `\n${c.crisisLine}\n` : ""}
## ${SUBPAGE.stepsTitle}

${SUBPAGE.steps.map((s, i) => `${i + 1}. **${s.title}:** ${s.text}`).join("\n")}

Processo completo: ${absoluteUrl(`${AVALIACAO_PATH}#como-funciona`)}

## ${SUBPAGE.faqTitle}

${c.faq.map((f) => `**${f.question}**\n${f.answer}`).join("\n\n")}

## ${SUBPAGE.refsTitle}

${c.references.map((r, i) => `${i + 1}. ${r.text}${r.doi ? ` https://doi.org/${r.doi}` : ""}`).join("\n")}

${bookingFooter({ whatsapp: AVALIACAO_WHATSAPP_MESSAGE, presencialOnly: true })}`;
}
