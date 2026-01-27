"use client";

import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { whatsappUrl } from "@/lib/constant";

import { logEvent } from "firebase/analytics";
import { initAnalytics } from "@/lib/firebase";
import { useTimeToAction } from "@/hooks/use-time-to-action";

export function FloatingCatButton() {
    const { getElapsedTime } = useTimeToAction();

    const handleClick = async () => {
        const analytics = await initAnalytics();
        if (!analytics) return;

        logEvent(analytics, "schedule_click", {
            source: "floating_button",
            time_to_click_ms: getElapsedTime()
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
