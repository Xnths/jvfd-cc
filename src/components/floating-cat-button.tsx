"use client";

import { trackWhatsappClick } from "@/lib/whatsapp-lead";
import { FaWhatsapp } from "react-icons/fa";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { sendGAEvent } from "@next/third-parties/google";
import posthog from "posthog-js";
import { usePathname } from "next/navigation";

// Pages with their own sticky WhatsApp bar, which sends the page's own text (the ad upload tells avaliação leads
// apart by that text). The bubble would send the generic one.
const HIDDEN_ON = ["/avaliacao-neuropsicologica"];

export function FloatingCatButton() {
    const whatsappUrl = useWhatsappUrl();
    const { getElapsedTime } = useTimeToAction();
    const pathname = usePathname();

    const handleClick = () => {
        const elapsedTime = getElapsedTime() || 0;

        sendGAEvent('event', 'schedule_click', {
            source: 'floating_button',
            time_to_click_ms: elapsedTime,
        });
        posthog.capture('schedule_click', {
            source: 'floating_button',
            time_to_click_ms: elapsedTime,
        });
        trackWhatsappClick('floating_button');
    };

    if (pathname && HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="
        fixed bottom-6 right-6 z-40
        flex items-center gap-3
        bg-green-600 hover:bg-green-700
        text-white px-5 py-3
        rounded-full shadow-lg
        text-base font-medium
        cursor-pointer
        transition-all
        hover:animate-none
      "
        >
            <FaWhatsapp className="w-6 h-6" aria-hidden="true" />
        </a>
    );
}