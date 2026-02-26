import type { CollectionConfig } from 'payload'

const isAdmin = ({ req: { user } }: { req: { user: unknown } }) =>
    !!(user && (user as unknown as { collection: string }).collection === 'users')

export const BlogUsers: CollectionConfig = {
    slug: 'blog-users',
    auth: true,
    admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'email', 'active', 'createdAt'],
        description: 'Usuários cadastrados para comentar no blog.',
        group: 'Blog',
    },
    labels: {
        singular: 'Usuário do Blog',
        plural: 'Usuários do Blog',
    },
    access: {
        create: () => true,
        read: ({ req: { user } }) => {
            if (!user) return false
            if ((user as unknown as { collection: string }).collection === 'users') return true
            return {
                id: { equals: (user as { id: string }).id },
            }
        },
        update: ({ req: { user } }) => {
            if (!user) return false
            if ((user as unknown as { collection: string }).collection === 'users') return true
            return {
                id: { equals: (user as { id: string }).id },
            }
        },
        delete: isAdmin,
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            label: 'Nome de exibição',
        },
        {
            name: 'subscribedToNewsletter',
            type: 'checkbox',
            defaultValue: false,
            label: 'Inscrito na newsletter',
            admin: {
                description: 'Quando ativo, o usuário recebe e-mails de novos artigos.',
            },
        },
        {
            name: 'lgpdConsentedAt',
            type: 'date',
            required: true,
            label: 'Consentimento LGPD registrado em',
            access: {
                read: isAdmin,
            },
            admin: {
                readOnly: true,
                position: 'sidebar',
                description: 'Data e hora do consentimento explícito (LGPD Art. 7, I).',
            },
        },
        {
            name: 'active',
            type: 'checkbox',
            defaultValue: true,
            label: 'Conta ativa',
            access: {
                read: isAdmin,
                update: isAdmin,
            },
            admin: {
                position: 'sidebar',
                description: 'Desmarque para suspender o acesso sem deletar os dados.',
            },
        },
    ],
}
