'use client'

import { useEffect } from 'react'

/**
 * Injects GA4 (gtag.js) into document.head from an afterNavLinks slot.
 * Payload 3 has no admin.components.head — this component uses useEffect
 * to imperatively add the script tags, making window.gtag available for
 * LeadsStatusButtons GA4 events.
 *
 * Renders nothing visible.
 */
export function AdminGA4() {
    useEffect(() => {
        const gaId = process.env.NEXT_PUBLIC_GA_ID
        if (!gaId || document.getElementById('admin-ga4-script')) return

        // 1. gtag.js loader
        const loader = document.createElement('script')
        loader.id = 'admin-ga4-script'
        loader.async = true
        loader.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
        document.head.appendChild(loader)

        // 2. Inline init
        const init = document.createElement('script')
        init.id = 'admin-ga4-init'
        init.textContent = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: false });
`
        document.head.appendChild(init)
    }, [])

    return null
}
