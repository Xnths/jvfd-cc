import type { CollectionConfig } from 'payload'
import formatSlug from '../utils/formatSlug'
import { revalidateTreatmentAfterChange, revalidateTreatmentAfterDelete } from '../hooks/revalidate'

export const Treatments: CollectionConfig = {
    slug: 'treatments',
    admin: {
        useAsTitle: 'title',
    },
    access: {
        read: () => true,
    },
    hooks: {
        afterChange: [revalidateTreatmentAfterChange],
        afterDelete: [revalidateTreatmentAfterDelete],
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            required: true,
            label: 'Título',
        },
        {
            name: 'slug',
            type: 'text',
            unique: true,
            label: 'Slug (URL)',
            admin: {
                description: 'Gerado automaticamente a partir do título se deixado em branco.',
                position: 'sidebar',
            },
            hooks: {
                beforeValidate: [formatSlug('title')],
            },
        },
        {
            name: 'subtitle',
            type: 'textarea',
            label: 'Subtítulo',
        },
        {
            name: 'content',
            type: 'richText',
            label: 'Conteúdo',
            required: true,
        },
        {
            name: 'metaTitle',
            type: 'text',
            label: 'Meta Título (SEO)',
        },
        {
            name: 'metaDescription',
            type: 'textarea',
            label: 'Meta Descrição (SEO)',
        },
        {
            name: 'preview',
            type: 'ui',
            admin: {
                position: 'sidebar',
                components: {
                    Field: '@/components/payload/PreviewButton#PreviewButton',
                },
            },
        },
    ],
}
