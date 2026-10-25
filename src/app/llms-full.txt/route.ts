import { SITE_URL } from '@/content/clinic'
import { getPublishedPosts, getTreatments } from '@/lib/queries'
import {
    homeMarkdown,
    postMarkdown,
    presencialMarkdown,
    treatmentMarkdown,
    tutoringMarkdown,
} from '@/lib/markdown'
import { publicCacheHeaders } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function GET() {
    const [posts, treatments] = await Promise.all([
        getPublishedPosts().catch(() => []),
        getTreatments().catch(() => []),
    ])

    const body = [
        `<!-- Conteúdo completo de ${SITE_URL} para modelos de linguagem -->`,
        homeMarkdown(posts),
        ...treatments.map(treatmentMarkdown),
        presencialMarkdown(),
        tutoringMarkdown(),
        ...posts.map(postMarkdown),
    ].join('\n\n\n')

    return new Response(body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...publicCacheHeaders },
    })
}
