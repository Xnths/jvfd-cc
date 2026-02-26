import type { CollectionConfig } from 'payload'

export const Comments: CollectionConfig = {
    slug: 'comments',
    admin: {
        useAsTitle: 'body',
        defaultColumns: ['post', 'author', 'status', 'createdAt'],
        description: 'Comentários dos posts do blog. Aprovar antes de publicar.',
        group: 'Blog',
    },
    labels: {
        singular: 'Comentário',
        plural: 'Comentários',
    },
    access: {
        // Any authenticated blog-user can create
        create: ({ req: { user } }) =>
            !!(user && (user as unknown as { collection: string }).collection === 'blog-users'),
        // Public can read approved; admins read all
        read: ({ req: { user } }) => {
            if (user && (user as unknown as { collection: string }).collection === 'users') return true
            return { status: { equals: 'approved' } }
        },
        // Only admins can update (moderate) or delete
        update: ({ req: { user } }) =>
            !!(user && (user as unknown as { collection: string }).collection === 'users'),
        delete: ({ req: { user } }) =>
            !!(user && (user as unknown as { collection: string }).collection === 'users'),
    },
    fields: [
        {
            name: 'post',
            type: 'relationship',
            relationTo: 'posts',
            required: true,
            label: 'Post',
            admin: { position: 'sidebar' },
        },
        {
            name: 'author',
            type: 'relationship',
            relationTo: 'blog-users',
            required: true,
            label: 'Autor',
            admin: { position: 'sidebar' },
        },
        {
            name: 'body',
            type: 'textarea',
            required: true,
            label: 'Comentário',
            maxLength: 2000,
            admin: {
                description: 'Máximo 2000 caracteres.',
            },
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'pending',
            label: 'Status de moderação',
            options: [
                { label: 'Pendente', value: 'pending' },
                { label: 'Aprovado', value: 'approved' },
                { label: 'Rejeitado', value: 'rejected' },
            ],
            admin: {
                position: 'sidebar',
                description: 'Apenas comentários aprovados aparecem no site.',
            },
        },
    ],
}
