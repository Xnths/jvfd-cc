import type { CollectionConfig } from 'payload'
import { isStaff } from './access'

export const Media: CollectionConfig = {
    slug: 'media',
    access: {
        read: () => true,
        create: isStaff,
        update: isStaff,
        delete: isStaff,
    },
    fields: [
        {
            name: 'alt',
            type: 'text',
            required: true,
        },
    ],
    upload: true,
}
