import { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const payload = await getPayload({ config: configPromise })
    const siteUrl = 'https://psicologojoaofernandes.com'

    const posts = await payload.find({
        collection: 'posts',
        limit: 1000,
    })

    const blogEntries: MetadataRoute.Sitemap = posts.docs.map((post) => ({
        url: `${siteUrl}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
    }))

    const treatments = await payload.find({
        collection: 'treatments',
        limit: 100,
    })

    const treatmentEntries: MetadataRoute.Sitemap = treatments.docs.map((treatment) => ({
        url: `${siteUrl}/${treatment.slug}`,
        lastModified: new Date(treatment.updatedAt),
        changeFrequency: 'monthly',
        priority: 0.9,
    }))

    const staticEntries: MetadataRoute.Sitemap = [
        {
            url: siteUrl,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 1,
        },
        {
            url: `${siteUrl}/politica-de-privacidade`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${siteUrl}/termos-de-uso`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
    ]

    return [...staticEntries, ...treatmentEntries, ...blogEntries]
}
