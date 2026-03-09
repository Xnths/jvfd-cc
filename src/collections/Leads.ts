import type { CollectionConfig } from 'payload'

const setConvertedAt: CollectionConfig['hooks'] = {
    beforeChange: [
        ({ data, originalDoc }) => {
            // Auto-set convertedAt only when first switching to converted and no date exists
            if (
                data.status === 'converted' &&
                !originalDoc?.convertedAt &&
                !data.convertedAt
            ) {
                data.convertedAt = new Date().toISOString()
            }
            return data
        },
    ],
}

export const Leads: CollectionConfig = {
    slug: 'leads',
    admin: {
        useAsTitle: 'gclid',
        defaultColumns: ['clickedAt', 'status', 'convertedAt', 'gclid'],
        description: 'Cliques no WhatsApp rastreados via GCLID (Google Ads). Atualize o status conforme o lead avança.',
        group: 'Publicidade',
        components: {
            afterListTable: ['@/components/admin/LeadsExportButton#LeadsExportButton'],
        },
    },
    labels: {
        singular: 'Lead',
        plural: 'Leads',
    },
    hooks: setConvertedAt,
    access: {
        create: () => true,
        read: ({ req: { user } }) =>
            !!(user && (user as unknown as { collection: string }).collection === 'users'),
        update: ({ req: { user } }) =>
            !!(user && (user as unknown as { collection: string }).collection === 'users'),
        delete: ({ req: { user } }) =>
            !!(user && (user as unknown as { collection: string }).collection === 'users'),
    },
    fields: [
        {
            name: 'gclid',
            type: 'text',
            required: true,
            unique: true,
            label: 'Google Click ID (GCLID)',
            admin: { readOnly: true },
        },
        {
            name: 'clickedAt',
            type: 'date',
            required: true,
            label: 'Clicou em',
            admin: {
                position: 'sidebar',
                date: { displayFormat: "dd/MM/yyyy 'às' HH:mm" },
            },
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'clicked',
            label: 'Status',
            options: [
                { label: '🖱️ Clicou no WhatsApp', value: 'clicked' },
                { label: '💬 Lead Qualificado (mandou mensagem)', value: 'qualified' },
                { label: '✅ Consulta Marcada', value: 'converted' },
            ],
            admin: {
                position: 'sidebar',
                components: {
                    Field: '@/components/admin/LeadsStatusButtons#default',
                },
            },
        },
        {
            name: 'convertedAt',
            type: 'date',
            label: 'Converteu em',
            admin: {
                position: 'sidebar',
                description: 'Preenchido automaticamente quando status muda para "Consulta Marcada". Pode ser editado manualmente.',
                date: { displayFormat: "dd/MM/yyyy 'às' HH:mm" },
            },
        },
    ],
}
