import { SITE_URL, contact, person, services } from '@/content/clinic'
import { tutoring } from '@/content/tutoring'
import { getPublishedPosts, getRoutes, getTreatments } from '@/lib/queries'
import { publicCacheHeaders } from '@/lib/http'

export const dynamic = 'force-dynamic'

const QUICK_ANSWERS = [
    '/perguntas/o-que-e-avaliacao-neuropsicologica',
    '/perguntas/quanto-tempo-dura-a-avaliacao-neuropsicologica',
    '/perguntas/quem-pode-fazer-avaliacao-neuropsicologica',
    '/perguntas/onde-fazer-avaliacao-neuropsicologica-na-vila-madalena',
    '/perguntas/como-funciona-a-psicoterapia',
    '/perguntas/terapia-online-funciona',
    '/perguntas/onde-encontrar-psicologo-em-analise-do-comportamento-na-vila-madalena',
]

// llmstxt.org format: H1, blockquote summary, then link sections.
export async function GET() {
    const [posts, treatments, routes] = await Promise.all([
        getPublishedPosts().catch(() => []),
        getTreatments().catch(() => []),
        getRoutes().catch(() => []),
    ])
    const section = (title: string, kind: string) => {
        const rows = routes.filter((r) => r.kind === kind)
        return rows.length ? `\n## ${title}\n\n${rows.map((r) => `- [${r.title}](${SITE_URL}${r.path}.md)${r.description ? `: ${r.description}` : ''}`).join('\n')}\n` : ''
    }
    // The answers most people ask for. Listed only once they are published.
    const quickAnswers = routes.filter((r) => QUICK_ANSWERS.includes(r.path))
    const treatmentLinks = treatments.length
        ? treatments.map((t) => `- [${t.title}](${SITE_URL}/${t.slug}.md): ${t.subtitle ?? ''}`.trimEnd())
        : services.map((s) => `- [${s.name}](${SITE_URL}${s.href}.md): ${s.description}`)

    const body = `# Psicólogo João Fernandes

> ${person.name} é psicólogo clínico (CRP ${person.crp}) com atuação em ${person.approach}. Atende online para todo o Brasil e presencialmente na Vila Madalena, São Paulo. Psicoterapia individual, terapia de casal, plantão psicológico, atendimento afirmativo LGBTQIA+, avaliação neuropsicológica (somente presencial), supervisão clínica para psicólogos e aulas particulares. Atendimento particular, com recibo para reembolso.

Informações práticas: ${contact.address.street}, ${contact.address.neighborhood}, ${contact.address.locality}-${contact.address.region}, CEP ${contact.address.postalCode}. ${contact.hours.daysLabel}, ${contact.hours.opens}–${contact.hours.closes}. WhatsApp ${contact.phoneDisplay}. Serviços, blog, glossário, perguntas e perfis têm versão Markdown acrescentando ".md" à URL.

Avaliação neuropsicológica: entrevista, testes padronizados, laudo e devolutiva, com adultos e crianças, somente presencial na Vila Madalena. Em geral, de 4 a 6 sessões de até 2 horas cada. Requer pedido médico. Não atende por convênio; emite recibo para reembolso. Valores informados pelo WhatsApp.

Em risco imediato, procure o SAMU (192) ou o CVV (188): o WhatsApp do consultório não é um serviço de emergência.
${quickAnswers.length ? `\n## Respostas rápidas\n\n${quickAnswers.map((r) => `- [${r.title}](${SITE_URL}${r.path}.md)`).join('\n')}\n` : ''}
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
