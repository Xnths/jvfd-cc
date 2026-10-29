/**
 * GCLID (Google Click ID) cookie utilities.
 * Called client-side only.
 */

const COOKIE_NAME = 'gclid'
const AD_PARAMS_COOKIE = 'ad_params'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds
const AD_PARAM_KEYS = ['gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
const SAFE_VALUE = /^[A-Za-z0-9+/=_.~%-]{1,200}$/

function cookieAttrs(): string {
    const secure = window.location.protocol === 'https:' ? ';Secure' : ''
    return `;max-age=${COOKIE_MAX_AGE};path=/;SameSite=Lax${secure}`
}

/**
 * Reads ?gclid=, ?gbraid=, ?wbraid= and ?utm_* from the current URL and stores
 * them in first-party cookies. Safe to call on every page load — only writes
 * when the matching parameter is present.
 */
export function captureGclid(): void {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const gclid = params.get('gclid')
    if (gclid && /^[A-Za-z0-9+/=_-]+$/.test(gclid)) {
        document.cookie = `${COOKIE_NAME}=${gclid}${cookieAttrs()}`
    }
    const found: Record<string, string> = {}
    for (const key of AD_PARAM_KEYS) {
        const value = params.get(key)
        if (value && SAFE_VALUE.test(encodeURIComponent(value))) found[key] = value
    }
    if (Object.keys(found).length > 0) {
        document.cookie = `${AD_PARAMS_COOKIE}=${encodeURIComponent(JSON.stringify(found))}${cookieAttrs()}`
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

/**
 * Returns the stored gbraid / wbraid / utm_* values, or an empty object.
 */
export function getAdParamsFromCookie(): Record<string, string> {
    if (typeof document === 'undefined') return {}
    const match = document.cookie.match(/(?:^|;\s*)ad_params=([^;]+)/)
    if (!match) return {}
    try {
        return JSON.parse(decodeURIComponent(match[1]))
    } catch {
        return {}
    }
}
