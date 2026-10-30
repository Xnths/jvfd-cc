import { getAdParamsFromCookie, getGclidFromCookie, getLandingUrlFromCookie } from '@/lib/gclid'

/**
 * Records one WhatsApp click as a lead (the server uploads it to Google Ads when it carries a click id).
 * Fire-and-forget: navigation never waits for it. Clicks without a click id are stored too, for the admin list.
 */
export function trackWhatsappClick(source: string): void {
    if (typeof window === 'undefined') return
    const ad = getAdParamsFromCookie()
    const body = JSON.stringify({
        id: crypto.randomUUID(),
        clicked_at: new Date().toISOString(),
        source,
        page_url: window.location.href.slice(0, 500),
        landing_url: getLandingUrlFromCookie(),
        gclid: getGclidFromCookie() ?? '',
        gbraid: ad.gbraid ?? '',
        wbraid: ad.wbraid ?? '',
        utm_source: ad.utm_source ?? '',
        utm_medium: ad.utm_medium ?? '',
        utm_campaign: ad.utm_campaign ?? '',
        utm_term: ad.utm_term ?? '',
        utm_content: ad.utm_content ?? '',
    })
    const sent = navigator.sendBeacon
        ? navigator.sendBeacon('/api/leads', new Blob([body], { type: 'application/json' }))
        : false
    if (!sent) {
        fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
        }).catch(() => {})
    }
}
