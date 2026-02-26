import type { CollectionConfig } from 'payload'
import formatSlug from '../utils/formatSlug'
import { sendNewsletterForPost } from '../hooks/sendNewsletterForPost'

export const Posts: CollectionConfig = {
    slug: 'posts',
    admin: {
        useAsTitle: 'title',
    },
    access: {
        read: () => true,
    },
    hooks: {
        afterChange: [sendNewsletterForPost],
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
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'draft',
            label: 'Status',
            options: [
                { label: 'Rascunho', value: 'draft' },
                { label: 'Publicado', value: 'published' },
            ],
            admin: {
                position: 'sidebar',
                description: 'Ao publicar, a newsletter será enviada automaticamente.',
            },
        },
        {
            name: 'excerpt',
            type: 'textarea',
            label: 'Resumo (Preview)',
            required: true,
            admin: {
                description: 'Um breve resumo do post para aparecer na página inicial.',
            },
        },
        {
            name: 'keywords',
            type: 'text',
            label: 'Palavras-chave (SEO)',
            admin: {
                description: 'Palavras-chave separadas por vírgula para SEO.',
                position: 'sidebar',
            },
        },
        {
            name: 'content',
            type: 'richText',
            label: 'Conteúdo',
            required: true,
            admin: {
                description: 'O conteúdo principal do post.',
            },
        },
        {
            name: 'publishedDate',
            type: 'date',
            label: 'Data de Publicação',
            required: true,
            defaultValue: () => new Date(),
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'author',
            type: 'text',
            label: 'Autor',
            defaultValue: 'João Vitor Fernandes',
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'image',
            type: 'upload',
            relationTo: 'media',
        },
    ],
}
