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
import type { PostDoc, TreatmentDoc } from "@/lib/queries";
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

const bookingFooter = () => `---

## Como agendar

- WhatsApp: ${whatsappLink("Olá, João! Vi seu site e gostaria de saber mais sobre a terapia.")}
- E-mail: ${contact.email}
- Atendimento online (videochamada, todo o Brasil) e presencial: ${formatAddress()}
- Horário: ${contact.hours.daysLabel}, ${contact.hours.opens} às ${contact.hours.closes}
- Profissional: ${person.name}, psicólogo, CRP ${person.crp}`;

const header = (title: string, path: string, updated?: string) =>
    `# ${title}\n\n> Fonte: ${absoluteUrl(path)}${updated ? ` · Atualizado em ${updated.slice(0, 10)}` : ""}\n`;

export function profileMarkdown() {
    return `## Sobre ${person.shortName}

${person.name} é psicólogo clínico (CRP ${person.crp}), com prática profissional desde ${person.practicingSince} e atuação fundamentada em ${person.approach}. Atende pessoas adultas online, para todo o Brasil, e presencialmente na Vila Madalena, em São Paulo. É psicólogo gay e atende de forma afirmativa a comunidade LGBTQIA+.

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
    return `${header(t.title, `/${t.slug}`, t.updatedAt)}
${t.subtitle ? `**${t.subtitle}**\n\n` : ""}${lexicalToMarkdown(t.content)}

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
