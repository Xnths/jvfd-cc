import { SITE_URL } from '@/content/clinic'
import { getAnsweredQuestions, getGlossary, getGlossaryTerm, getPublishedPosts, getTreatments } from '@/lib/queries'
import {
    glossaryTermMarkdown,
    homeMarkdown,
    postMarkdown,
    presencialMarkdown,
    questionMarkdown,
    treatmentMarkdown,
    tutoringMarkdown,
} from '@/lib/markdown'
import { publicCacheHeaders } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function GET() {
    const [posts, treatments, glossary, questions] = await Promise.all([
        getPublishedPosts().catch(() => []),
        getTreatments().catch(() => []),
        getGlossary().catch(() => []),
        getAnsweredQuestions().catch(() => []),
    ])
    const terms = await Promise.all(glossary.map((t) => getGlossaryTerm(t.slug).catch(() => null)))

    const body = [
        `<!-- Conteúdo completo de ${SITE_URL} para modelos de linguagem -->`,
        homeMarkdown(posts),
        ...treatments.map(treatmentMarkdown),
        presencialMarkdown(),
        tutoringMarkdown(),
        ...questions.filter((q) => q.slug).map(questionMarkdown),
        ...terms.flatMap((t) => (t ? [glossaryTermMarkdown(t)] : [])),
        ...posts.map(postMarkdown),
    ].join('\n\n\n')

    return new Response(body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...publicCacheHeaders },
    })
}
