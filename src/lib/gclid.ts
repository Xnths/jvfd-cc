/**
 * GCLID (Google Click ID) cookie utilities.
 * Called client-side only.
 */

const COOKIE_NAME = 'gclid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

/**
 * Reads ?gclid= from the current URL and stores it in a cookie.
 * Safe to call on every page load — only writes if gclid is present.
 */
export function captureGclid(): void {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const gclid = params.get('gclid')
    if (gclid && /^[A-Za-z0-9+/=_-]+$/.test(gclid)) {
        document.cookie = `${COOKIE_NAME}=${gclid};max-age=${COOKIE_MAX_AGE};path=/;SameSite=Lax`
    }
}

/**
 * Returns the stored GCLID from cookies, or null if not present.
 */
export function getGclidFromCookie(): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(/(?:^|;\s*)gclid=([^;]+)/)
    return match ? match[1] : null
}
