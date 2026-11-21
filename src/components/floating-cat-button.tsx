"use client";

import { trackWhatsappClick } from "@/lib/whatsapp-lead";
import { FaWhatsapp } from "react-icons/fa";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { sendGAEvent } from "@next/third-parties/google";
import posthog from "posthog-js";
import { usePathname } from "next/navigation";
import { isAvaliacaoPath } from "@/content/avaliacao-cta";

// Hidden on the avaliação pages, which have their own sticky WhatsApp bar with the page's own text (the ad upload
// tells avaliação leads apart by that text). The footer leaves room for this button on phones (--bottom-ui-h in
// globals.css).

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

    if (isAvaliacaoPath(pathname)) return null;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            aria-label="Conversar pelo WhatsApp"
            className="
        fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] z-40
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