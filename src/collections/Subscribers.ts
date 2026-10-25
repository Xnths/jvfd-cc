import type { CollectionConfig } from 'payload'
import { isStaff } from './access'

export const Subscribers: CollectionConfig = {
    slug: 'subscribers',
    admin: {
        useAsTitle: 'email',
        defaultColumns: ['email', 'active', 'consentedAt'],
        description: 'Assinantes da newsletter do blog.',
        group: 'Newsletter',
    },
    labels: {
        singular: 'Assinante',
        plural: 'Assinantes',
    },
    access: {
        create: () => true,
        read: isStaff,
        update: isStaff,
        delete: isStaff,
    },
    timestamps: true,
    fields: [
        {
            name: 'email',
            type: 'email',
            required: true,
            unique: true,
            label: 'E-mail',
        },
        {
            name: 'consentedAt',
            type: 'date',
            required: true,
            label: 'Data de Consentimento',
            admin: {
                position: 'sidebar',
                readOnly: true,
                description: 'Registrado automaticamente no momento da inscrição (LGPD Art. 7).',
            },
        },
        {
            name: 'active',
            type: 'checkbox',
            defaultValue: true,
            label: 'Ativo',
            admin: {
                position: 'sidebar',
                description: 'Desmarque para cancelar a inscrição (unsubscribe).',
            },
        },
    ],
}
