import { SITE_URL, contact, person, services } from '@/content/clinic'
import { tutoring } from '@/content/tutoring'
import { getPublishedPosts, getRoutes, getTreatments } from '@/lib/queries'
import { publicCacheHeaders } from '@/lib/http'

export const dynamic = 'force-dynamic'

// llmstxt.org format: H1, blockquote summary, then link sections.
export async function GET() {
    const [posts, treatments, routes] = await Promise.all([
        getPublishedPosts().catch(() => []),
        getTreatments().catch(() => []),
        getRoutes().catch(() => []),
    ])
    const section = (title: string, kind: string) => {
        const rows = routes.filter((r) => r.kind === kind)
        return rows.length ? `\n## ${title}\n\n${rows.map((r) => `- [${r.title}](${SITE_URL}${r.path}): ${r.description}`.trimEnd()).join('\n')}\n` : ''
    }
    const treatmentLinks = treatments.length
        ? treatments.map((t) => `- [${t.title}](${SITE_URL}/${t.slug}.md): ${t.subtitle ?? ''}`.trimEnd())
        : services.map((s) => `- [${s.name}](${SITE_URL}${s.href}.md): ${s.description}`)

    const body = `# Psicólogo João Fernandes

> ${person.name} é psicólogo clínico (CRP ${person.crp}) com atuação em ${person.approach}. Atende online para todo o Brasil e presencialmente na Vila Madalena, São Paulo. Psicoterapia individual, terapia de casal, plantão psicológico, atendimento afirmativo LGBTQIA+, supervisão clínica para psicólogos e aulas particulares. Atendimento particular, com recibo para reembolso.

Informações práticas: ${contact.address.street}, ${contact.address.neighborhood}, ${contact.address.locality}-${contact.address.region}, CEP ${contact.address.postalCode}. ${contact.hours.daysLabel}, ${contact.hours.opens}–${contact.hours.closes}. WhatsApp ${contact.phoneDisplay}. Todas as páginas têm versão Markdown acrescentando ".md" à URL.

## Atendimentos

${treatmentLinks.join('\n')}
- [Atendimento presencial na Vila Madalena](${SITE_URL}/presencial.md): endereço, como chegar e acessibilidade.

## Aulas particulares

- [${tutoring.shortName}](${SITE_URL}${tutoring.path}.md): ${tutoring.description}

## Blog

${posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}.md): ${p.excerpt}`).join('\n') || '- [Índice do blog](' + SITE_URL + '/blog.md)'}

${section('Glossário', 'glossary')}${section('Perguntas respondidas', 'question')}${section('Equipe', 'profile')}
## Ferramentas

- [PHQ-9: rastreio de sintomas depressivos](${SITE_URL}/ferramentas/phq-9): questionário de autoavaliação, calculado no navegador.
- [GAD-7: rastreio de sintomas de ansiedade](${SITE_URL}/ferramentas/gad-7): questionário de autoavaliação, calculado no navegador.

## Optional

- [Página inicial](${SITE_URL}/index.md)
- [Conteúdo completo em um único arquivo](${SITE_URL}/llms-full.txt)
- [Feed RSS](${SITE_URL}/feed.xml)
`

    return new Response(body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...publicCacheHeaders },
    })
}
