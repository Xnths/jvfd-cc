import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/content/clinic'
import { tutoring } from '@/content/tutoring'
import { getMedia, getPublishedPosts, getTreatments } from '@/lib/queries'

// Per request, but backed by the tag-invalidated query cache (no DB hit).
export const dynamic = 'force-dynamic'

// Bump when the hand-written pages (home sections, presencial, aulas,
// policies) change meaningfully.
const STATIC_CONTENT_UPDATED = new Date('2026-10-24')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [posts, treatments] = await Promise.all([
        getPublishedPosts().catch(() => []),
        getTreatments().catch(() => []),
    ])

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

    return [...staticEntries, ...treatmentEntries, ...blogEntries]
}
