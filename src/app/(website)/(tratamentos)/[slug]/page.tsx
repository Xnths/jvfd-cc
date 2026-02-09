import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { TreatmentPage } from '@/components/TreatmentPage'
import { RichText } from '@/components/RichText'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

// Force dynamic rendering if necessary, but ISR is better
export const revalidate = 60

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
        const payload = await getPayload({ config: configPromise })
        const treatments = await payload.find({
            collection: 'treatments',
            limit: 100,
        })

        return treatments.docs.map((treatment) => ({
            slug: treatment.slug,
        }))
    } catch (error) {
        console.warn('Could not connect to database during generateStaticParams. Skipping static generation.', error)
        return []
    }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug } = await params
    const payload = await getPayload({ config: configPromise })

    try {
        const result = await payload.find({
            collection: 'treatments',
            where: {
                slug: {
                    equals: slug,
                },
            },
        })

        if (!result.docs[0]) {
            return {}
        }

        const treatment = result.docs[0]

        return {
            title: treatment.metaTitle || treatment.title + ' | Psicólogo João Fernandes',
            description: treatment.metaDescription,
        }
    } catch (error) {
        console.error('Error fetching metadata:', error)
        return {}
    }
}

export default async function Page({ params }: { params: Promise<Params> }) {
    const { slug } = await params
    const payload = await getPayload({ config: configPromise })

    try {
        const result = await payload.find({
            collection: 'treatments',
            where: {
                slug: {
                    equals: slug,
                },
            },
        })

        if (!result.docs[0]) {
            notFound()
        }

        const treatment = result.docs[0]

        return (
            <TreatmentPage
                title={treatment.title}
                subtitle={treatment.subtitle || ''}
            >
                <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                    <RichText content={treatment.content} />
                </div>
            </TreatmentPage>
        )
    } catch (error) {
        console.error('Error rendering page:', error)
        notFound()
    }
}
