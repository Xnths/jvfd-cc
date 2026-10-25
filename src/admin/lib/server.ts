import 'server-only'
import { cookies } from 'next/headers'

export type AdminMe = { id: string; email: string; role: 'clinical' | 'tech' | string }

const API = process.env.API_INTERNAL_URL ?? 'http://clinic-api:8080'

/**
 * Server-side session check for the admin layout. Returns the signed-in admin,
 * "anonymous" when there is no valid access token (the caller redirects to
 * /auth/refresh), or "unavailable" when the API cannot be reached.
 */
export async function getAdmin(): Promise<AdminMe | 'anonymous' | 'unavailable'> {
    const jar = await cookies()
    const token = jar.get('__Host-clinic_at')?.value ?? jar.get('clinic_at')?.value
    if (!token) return 'anonymous'
    try {
        const res = await fetch(`${API}/api/v1/admin/me`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        })
        if (res.status === 401) return 'anonymous'
        if (!res.ok) return 'unavailable'
        return (await res.json()) as AdminMe
    } catch {
        return 'unavailable'
    }
}
