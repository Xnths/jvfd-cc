import type { FieldHook } from 'payload'

const format = (val: string): string =>
    val
        .normalize('NFD') // Normalizes accents (e.g., 'ã' -> 'a' + '~')
        .replace(/[\u0300-\u036f]/g, '') // Removes the accent marks
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '')

const formatSlug =
    (fallback: string): FieldHook =>
        ({ operation, value, originalDoc, data }) => {
            if (typeof value === 'string') {
                return format(value)
            }

            if (operation === 'create') {
                const fallbackData = data?.[fallback] || originalDoc?.[fallback]

                if (fallbackData && typeof fallbackData === 'string') {
                    return format(fallbackData)
                }
            }

            return value
        }

export default formatSlug
