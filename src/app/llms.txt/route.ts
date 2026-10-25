import { SITE_URL, contact, person, services } from '@/content/clinic'
import { tutoring } from '@/content/tutoring'
import { getPublishedPosts, getTreatments } from '@/lib/queries'
import { publicCacheHeaders } from '@/lib/http'

export const dynamic = 'force-dynamic'

// llmstxt.org format: H1, blockquote summary, then link sections.
export async function GET() {
    const [posts, treatments] = await Promise.all([
        getPublishedPosts().catch(() => []),
        getTreatments().catch(() => []),
    ])
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

## Optional

- [Página inicial](${SITE_URL}/index.md)
- [Conteúdo completo em um único arquivo](${SITE_URL}/llms-full.txt)
- [Feed RSS](${SITE_URL}/feed.xml)
`

    return new Response(body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...publicCacheHeaders },
    })
}
