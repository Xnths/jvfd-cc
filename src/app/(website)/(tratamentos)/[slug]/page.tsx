import { ServicePage } from '@/components/ServicePage'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { getTreatmentBySlug, getTreatments } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { breadcrumbNode, graph, therapyNode, webPageNode } from '@/lib/jsonld'

// ISR: cached until a Payload hook invalidates the "treatments" tag.
export const revalidate = 86400

type Params = {
    slug: string
}

export async function generateStaticParams() {
    // If DATABASE_URI is not set, we are likely building in an environment without DB access
    // Skip static generation to allow build to succeed. Pages will be generated on demand.
    if (!process.env.DATABASE_URI) {
        return []
    }

    try {
        const treatments = await getTreatments()
        return treatments.map((treatment) => ({ slug: treatment.slug }))
    } catch (error) {
        console.warn('Could not connect to database during generateStaticParams. Skipping static generation.', error)
        return []
    }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug } = await params

    try {
        const treatment = await getTreatmentBySlug(slug)
        if (!treatment) {
            return {}
        }

        return buildMetadata({
            ...(treatment.metaTitle ? { absoluteTitle: treatment.metaTitle } : { title: treatment.title }),
            description: treatment.metaDescription || treatment.subtitle || undefined,
            path: `/${treatment.slug}`,
        })
    } catch (error) {
        console.error('Error fetching metadata:', error)
        return {}
    }
}

export default async function Page({ params }: { params: Promise<Params> }) {
    const { slug } = await params

    let treatment
    try {
        treatment = await getTreatmentBySlug(slug)
    } catch (error) {
        console.error('Error rendering page:', error)
    }

    if (!treatment) {
        notFound()
    }

    const path = `/${treatment.slug}`
    const description = treatment.metaDescription || treatment.subtitle

    return (
        <>
            <JsonLd
                data={graph(
                    webPageNode({ path, name: treatment.title, description }),
                    therapyNode({ path, name: treatment.title, description }),
                    breadcrumbNode([{ name: treatment.title, path }]),
                )}
            />
            <ServicePage
                slug={slug}
                title={treatment.title}
                subtitle={treatment.subtitle || ''}
                content={treatment.content}
            />
        </>
    )
}
