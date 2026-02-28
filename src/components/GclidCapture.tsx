'use client'

import { useEffect } from 'react'
import { captureGclid } from '@/lib/gclid'

/**
 * Invisible client component that captures ?gclid= on every page load.
 * Add to the root layout to ensure it fires on ad landing pages.
 */
export function GclidCapture() {
    useEffect(() => {
        captureGclid()
    }, [])

    return null
}
