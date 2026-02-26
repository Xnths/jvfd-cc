"use client";

import { useState, useEffect } from "react";

const phone = "5511955591996";
const message = encodeURIComponent(
    "Olá! Gostaria de saber mais sobre os atendimentos."
);

const fallbackUrl = `https://wa.me/${phone}?text=${message}`;

/**
 * Returns the best WhatsApp URL based on the user's device.
 * - Desktop: uses api.whatsapp.com (opens WhatsApp Web without QR Code prompt)
 * - Mobile: uses wa.me (opens native app)
 *
 * Uses useEffect to avoid hydration mismatch (SSR always returns wa.me).
 */
export function useWhatsappUrl(): string {
    const [url, setUrl] = useState(fallbackUrl);

    useEffect(() => {
        const ua = navigator.userAgent;
        const isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

        if (!isMobile) {
            setUrl(`https://api.whatsapp.com/send?phone=${phone}&text=${message}`);
        }
    }, []);

    return url;
}
