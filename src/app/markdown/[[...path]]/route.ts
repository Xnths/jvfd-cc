import { SITE_URL } from '@/content/clinic'
import { tutoring } from '@/content/tutoring'
import { getPostBySlug, getPublishedPosts, getTreatmentBySlug } from '@/lib/queries'
import {
    blogIndexMarkdown,
    homeMarkdown,
    postMarkdown,
    presencialMarkdown,
    treatmentMarkdown,
    tutoringMarkdown,
} from '@/lib/markdown'
import { publicCacheHeaders } from '@/lib/http'

export const dynamic = 'force-dynamic'

// Markdown twin of every public page. src/proxy.ts rewrites "/page.md" and
// Accept: text/markdown requests here.
export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
    const { path = [] } = await params
    const key = path.join('/')
    let body: string | null = null

    if (key === '') body = homeMarkdown(await getPublishedPosts().catch(() => []))
    else if (key === 'blog') body = blogIndexMarkdown(await getPublishedPosts().catch(() => []))
    else if (key === 'presencial') body = presencialMarkdown()
    else if (`/${key}` === tutoring.path) body = tutoringMarkdown()
    else if (path[0] === 'blog' && path.length === 2) {
        const post = await getPostBySlug(path[1]).catch(() => null)
        if (post) body = postMarkdown(post)
    } else if (path.length === 1) {
        const t = await getTreatmentBySlug(path[0]).catch(() => null)
        if (t) body = treatmentMarkdown(t)
    }

    if (body === null) return new Response('Not found', { status: 404 })

    return new Response(body, {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            Link: `<${SITE_URL}${key ? `/${key}` : ''}>; rel="canonical"`,
            Vary: 'Accept',
            ...publicCacheHeaders,
        },
    })
}
