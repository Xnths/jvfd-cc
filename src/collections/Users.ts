import type { CollectionConfig } from 'payload'
import { isStaff } from './access'

export const Users: CollectionConfig = {
    slug: 'users',
    admin: {
        useAsTitle: 'email',
    },
    auth: true,
    access: {
        // Only existing staff may manage staff accounts (first user is created via the Payload CLI/local API).
        create: isStaff,
        read: isStaff,
        update: isStaff,
        delete: isStaff,
    },
    fields: [
        // Email and Password are added by default
    ],
}
