"use client";

import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { whatsappUrl } from "@/lib/constant";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { sendGAEvent } from "@next/third-parties/google";

export function FloatingCatButton() {
    const { getElapsedTime } = useTimeToAction();

    const handleClick = () => {
        const elapsedTime = getElapsedTime() || 0;

        console.log("Sending GA Event:", {
            event: 'schedule_click',
            source: 'floating_button',
            time_to_click_ms: elapsedTime
        });

        sendGAEvent('event', 'schedule_click', {
            source: 'floating_button',
            time_to_click_ms: elapsedTime,
            debug_mode: true // Enables event to be seen in GA4 DebugView
        });
    };

    return (
        <Link
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="
        fixed bottom-6 right-6 z-50
        flex items-center gap-3
        bg-red-600 hover:bg-red-700
        text-white px-5 py-3
        rounded-full shadow-lg
        text-base font-medium
        transition-all
      "
        >
            <FaWhatsapp className="w-6 h-6" />
            Agendar atendimento
        </Link>
    );
}