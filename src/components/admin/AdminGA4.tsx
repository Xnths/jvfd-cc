'use client'

import { useEffect } from 'react'

/**
 * Injects GA4 (gtag.js) into document.head from an afterNavLinks slot.
 *
 * KEY: The inline init (which defines window.gtag and window.dataLayer) is
 * appended BEFORE the async loader. This means window.gtag is available
 * immediately — events fired before the network script loads are queued in
 * dataLayer and replayed automatically once gtag.js finishes loading.
 */
export function AdminGA4() {
    useEffect(() => {
        const gaId = process.env.NEXT_PUBLIC_GA_ID
        if (!gaId || document.getElementById('admin-ga4-init')) return

        // 1. Inline stub — defines window.gtag and window.dataLayer immediately
        const init = document.createElement('script')
        init.id = 'admin-ga4-init'
        init.textContent = [
            'window.dataLayer = window.dataLayer || [];',
            'function gtag(){dataLayer.push(arguments);}',
            "gtag('js', new Date());",
            `gtag('config', '${gaId}', { send_page_view: false });`,
        ].join('\n')
        document.head.appendChild(init)

        // 2. Async loader — fetches the real gtag.js after the stub is ready
        const loader = document.createElement('script')
        loader.id = 'admin-ga4-script'
        loader.async = true
        loader.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
        document.head.appendChild(loader)

        console.log('[AdminGA4] GA4 scripts injected for', gaId)
    }, [])

    return null
}
