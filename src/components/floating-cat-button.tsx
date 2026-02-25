"use client";

import { FaWhatsapp } from "react-icons/fa";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { sendGAEvent } from "@next/third-parties/google";

export function FloatingCatButton() {
    const whatsappUrl = useWhatsappUrl();
    const { getElapsedTime } = useTimeToAction();

    const handleClick = () => {
        const elapsedTime = getElapsedTime() || 0;

        sendGAEvent('event', 'schedule_click', {
            source: 'floating_button',
            time_to_click_ms: elapsedTime,
        });
    };

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
            <FaWhatsapp className="w-6 h-6" />
        </a>
    );
}