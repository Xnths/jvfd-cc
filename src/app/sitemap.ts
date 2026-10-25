import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/content/clinic'
import { tutoring } from '@/content/tutoring'
import { getMedia, getPublishedPosts, getRoutes, getTreatments } from '@/lib/queries'

// Per request, but backed by the tag-invalidated query cache (no DB hit).
export const dynamic = 'force-dynamic'

// Bump when the hand-written pages (home sections, presencial, aulas,
// policies) change meaningfully.
const STATIC_CONTENT_UPDATED = new Date('2026-10-24')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [posts, treatments, routes] = await Promise.all([
        getPublishedPosts().catch(() => []),
        getTreatments().catch(() => []),
        getRoutes().catch(() => []),
    ])
    const hasKind = (k: string) => routes.some((r) => r.kind === k)

    const latest = (dates: string[]) =>
        dates.reduce((max, d) => (new Date(d) > max ? new Date(d) : max), STATIC_CONTENT_UPDATED)

    const blogEntries: MetadataRoute.Sitemap = posts.map((post) => {
        const image = getMedia(post.image)
        return {
            url: `${SITE_URL}/blog/${post.slug}`,
            lastModified: new Date(post.updatedAt),
            changeFrequency: 'monthly',
            priority: 0.7,
            ...(image?.url ? { images: [new URL(image.url, SITE_URL).toString()] } : {}),
        }
    })

    const treatmentEntries: MetadataRoute.Sitemap = treatments.map((treatment) => ({
        url: `${SITE_URL}/${treatment.slug}`,
        lastModified: new Date(treatment.updatedAt),
        changeFrequency: 'monthly',
        priority: 0.9,
    }))

    const staticEntries: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified: latest(posts.slice(0, 3).map((p) => p.updatedAt)),
            changeFrequency: 'weekly',
            priority: 1,
            images: [`${SITE_URL}/jv.jpeg`, `${SITE_URL}/consultorio.jpg`],
        },
        {
            url: `${SITE_URL}/presencial`,
            lastModified: STATIC_CONTENT_UPDATED,
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${SITE_URL}${tutoring.path}`,
            lastModified: STATIC_CONTENT_UPDATED,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/blog`,
            lastModified: latest(posts.map((p) => p.updatedAt)),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/politica-de-privacidade`,
            lastModified: STATIC_CONTENT_UPDATED,
            changeFrequency: 'yearly',
            priority: 0.2,
        },
        {
            url: `${SITE_URL}/termos-de-uso`,
            lastModified: STATIC_CONTENT_UPDATED,
            changeFrequency: 'yearly',
            priority: 0.2,
        },
    ]

    // Glossary terms, answered questions and team profiles come from the Go API's route list.
    const dynamicEntries: MetadataRoute.Sitemap = routes
        .filter((r) => ['glossary', 'question', 'profile'].includes(r.kind))
        .map((r) => ({ url: `${SITE_URL}${r.path}`, lastModified: new Date(r.updatedAt), changeFrequency: 'monthly' as const, priority: r.kind === 'profile' ? 0.6 : 0.5 }))

    const sectionEntries: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/ferramentas`, lastModified: STATIC_CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.5 },
        { url: `${SITE_URL}/ferramentas/phq-9`, lastModified: STATIC_CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.6 },
        { url: `${SITE_URL}/ferramentas/gad-7`, lastModified: STATIC_CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.6 },
        ...(hasKind('profile') ? [{ url: `${SITE_URL}/sobre`, lastModified: STATIC_CONTENT_UPDATED, changeFrequency: 'monthly' as const, priority: 0.6 }] : []),
        ...(hasKind('glossary') ? [{ url: `${SITE_URL}/glossario`, lastModified: latest(routes.filter((r) => r.kind === 'glossary').map((r) => r.updatedAt)), changeFrequency: 'weekly' as const, priority: 0.6 }] : []),
        ...(hasKind('question') ? [{ url: `${SITE_URL}/perguntas`, lastModified: latest(routes.filter((r) => r.kind === 'question').map((r) => r.updatedAt)), changeFrequency: 'weekly' as const, priority: 0.6 }] : []),
    ]

    return [...staticEntries, ...sectionEntries, ...treatmentEntries, ...dynamicEntries, ...blogEntries]
}
