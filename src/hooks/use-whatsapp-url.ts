"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AVALIACAO_WHATSAPP_MESSAGE, isAvaliacaoPath } from "@/content/avaliacao-cta";

const phone = "5511955591996";
const genericMessage = "Olá! Gostaria de saber mais sobre os atendimentos.";

function buildUrl(text: string, isMobile: boolean): string {
    const message = encodeURIComponent(text);
    return isMobile ? `https://wa.me/${phone}?text=${message}` : `https://api.whatsapp.com/send?phone=${phone}&text=${message}`;
}

/**
 * Returns the best WhatsApp URL based on the user's device.
 * - Desktop: uses api.whatsapp.com (opens WhatsApp Web without QR Code prompt)
 * - Mobile: uses wa.me (opens native app)
 *
 * On the avaliação pages (/avaliacao-neuropsicologica and its condition pages) the header, contact card and footer
 * send the avaliação text too: the Google Ads upload tells those leads apart by it.
 *
 * Uses useEffect to avoid hydration mismatch (SSR always returns wa.me).
 */
export function useWhatsappUrl(): string {
    const pathname = usePathname();
    const text = isAvaliacaoPath(pathname) ? AVALIACAO_WHATSAPP_MESSAGE : genericMessage;
    const [isMobile, setIsMobile] = useState(true);

    useEffect(() => {
        setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }, []);

    return buildUrl(text, isMobile);
}
