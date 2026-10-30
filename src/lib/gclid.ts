/**
 * GCLID (Google Click ID) cookie utilities.
 * Called client-side only.
 */

const COOKIE_NAME = 'gclid'
const AD_PARAMS_COOKIE = 'ad_params'
const LANDING_COOKIE = 'jf_landing'
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
    const validGclid = !!gclid && /^[A-Za-z0-9+/=_-]+$/.test(gclid)
    const found: Record<string, string> = {}
    for (const key of AD_PARAM_KEYS) {
        const value = params.get(key)
        if (value && SAFE_VALUE.test(encodeURIComponent(value))) found[key] = value
    }
    const hasClickId = validGclid || !!found.gbraid || !!found.wbraid
    if (hasClickId) {
        // Last click wins: a new click id replaces everything the previous one left behind.
        document.cookie = validGclid
            ? `${COOKIE_NAME}=${gclid}${cookieAttrs()}`
            : `${COOKIE_NAME}=;max-age=0;path=/`
        const landing = { url: window.location.href.slice(0, 500), ts: new Date().toISOString() }
        document.cookie = `${LANDING_COOKIE}=${encodeURIComponent(JSON.stringify(landing))}${cookieAttrs()}`
        document.cookie = Object.keys(found).length > 0
            ? `${AD_PARAMS_COOKIE}=${encodeURIComponent(JSON.stringify(found))}${cookieAttrs()}`
            : `${AD_PARAMS_COOKIE}=;max-age=0;path=/`
    } else if (Object.keys(found).length > 0) {
        document.cookie = `${AD_PARAMS_COOKIE}=${encodeURIComponent(JSON.stringify(found))}${cookieAttrs()}`
    }
}

/**
 * Returns the URL of the page where the current ad click landed, or an empty string.
 */
export function getLandingUrlFromCookie(): string {
    if (typeof document === 'undefined') return ''
    const match = document.cookie.match(/(?:^|;\s*)jf_landing=([^;]+)/)
    if (!match) return ''
    try {
        return JSON.parse(decodeURIComponent(match[1])).url ?? ''
    } catch {
        return ''
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
