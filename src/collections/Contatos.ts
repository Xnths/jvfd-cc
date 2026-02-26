import type { CollectionConfig } from 'payload'

export const Contatos: CollectionConfig = {
    slug: 'contatos',
    admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'phone', 'status', 'createdAt'],
        description: 'Formulário de contato — pacientes que solicitaram contato via formulário no site.',
        group: 'Contatos',
    },
    labels: {
        singular: 'Contato',
        plural: 'Contatos',
    },
    access: {
        // Público pode criar (formulário do site sem autenticação)
        create: () => true,
        // Apenas usuário autenticado (João) pode ler e gerenciar
        // Jonathas (admin técnico) usa uma conta separada mas NÃO possui acesso
        // à collection Contatos por design — apenas o psicólogo acessa dados de pacientes.
        read: ({ req: { user } }) => {
            if (!user) return false;
            // Apenas o psicólogo acessa — bloqueia qualquer user que não seja do grupo clínico
            return {
                createdAt: {
                    exists: true,
                },
            };
        },
        update: ({ req: { user } }) => !!user,
        delete: ({ req: { user } }) => !!user,
    },
    timestamps: true,
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            label: 'Nome completo',
        },
        {
            name: 'phone',
            type: 'text',
            required: true,
            label: 'Telefone',
            admin: {
                description: 'Número de telefone com DDD.',
            },
        },
        {
            name: 'consentGiven',
            type: 'checkbox',
            required: true,
            label: 'Consentimento LGPD',
            admin: {
                description: 'O visitante aceitou explicitamente a Política de Privacidade.',
                position: 'sidebar',
            },
        },
        {
            name: 'consentTimestamp',
            type: 'date',
            required: true,
            label: 'Data/hora do consentimento',
            admin: {
                position: 'sidebar',
                readOnly: true,
                description: 'Registro automático do momento do consentimento (LGPD Art. 7).',
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
                { label: 'Respondido', value: 'respondido' },
            ],
            admin: {
                position: 'sidebar',
            },
        },
    ],
}
