import type { CollectionConfig } from 'payload'

export const Leads: CollectionConfig = {
    slug: 'leads',
    admin: {
        useAsTitle: 'phone',
        defaultColumns: ['phone', 'status', 'createdAt'],
        description: 'Contatos rápidos — pacientes que preferiram deixar o número para o João entrar em contato.',
        group: 'Contatos',
    },
    labels: {
        singular: 'Lead',
        plural: 'Leads',
    },
    access: {
        // Público pode criar (formulário do site)
        create: () => true,
        // Apenas admin autenticado pode ler e atualizar
        read: ({ req: { user } }) => !!user,
        update: ({ req: { user } }) => !!user,
        delete: ({ req: { user } }) => !!user,
    },
    timestamps: true,
    fields: [
        {
            name: 'phone',
            type: 'text',
            required: true,
            label: 'Telefone',
            admin: {
                description: 'Número de telefone do paciente (com DDD).',
            },
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'novo',
            label: 'Status',
            options: [
                { label: 'Novo', value: 'novo' },
                { label: 'Contatado', value: 'contatado' },
            ],
            admin: {
                position: 'sidebar',
            },
        },
    ],
}
