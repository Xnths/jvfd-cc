'use client'

import { useEffect } from 'react'

declare global {
    interface Window {
        gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void
    }
}

/**
 * Loads gtag.js in the admin so lead status changes can fire the GA4 events Google Ads
 * imports as conversions. The stub is defined first so events fired before the script
 * arrives are queued in dataLayer.
 */
export function AdminGA4() {
    useEffect(() => {
        const gaId = process.env.NEXT_PUBLIC_GA_ID
        if (!gaId || document.getElementById('admin-ga4-init')) return

        const init = document.createElement('script')
        init.id = 'admin-ga4-init'
        init.textContent = [
            'window.dataLayer = window.dataLayer || [];',
            'function gtag(){dataLayer.push(arguments);}',
            "gtag('js', new Date());",
            `gtag('config', '${gaId}', { send_page_view: false });`,
        ].join('\n')
        document.head.appendChild(init)

        const loader = document.createElement('script')
        loader.id = 'admin-ga4-script'
        loader.async = true
        loader.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
        document.head.appendChild(loader)
    }, [])

    return null
}
