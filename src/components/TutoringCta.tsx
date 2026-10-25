"use client";

import { FaWhatsapp } from "react-icons/fa";
import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { whatsappLink } from "@/content/clinic";
import { tutoring } from "@/content/tutoring";
import { Editable } from "@/edit/Editable";

export function TutoringCta({ location }: { location: string }) {
    const baseUrl = useWhatsappUrl();
    const { getElapsedTime } = useTimeToAction();
    // useWhatsappUrl picks wa.me vs api.whatsapp.com by device; keep that host
    // but swap in the tutoring-specific message.
    const href = baseUrl.includes("api.whatsapp.com")
        ? `https://api.whatsapp.com/send?phone=5511955591996&text=${encodeURIComponent(tutoring.whatsappMessage)}`
        : whatsappLink(tutoring.whatsappMessage);

    const onClick = () => {
        const elapsed = getElapsedTime() ?? 0;
        const props = { source: "aulas_cta", location, time_to_click_ms: elapsed };
        sendGAEvent("event", "schedule_click", props);
        posthog.capture("schedule_click", props);
    };

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className="inline-flex items-center gap-3 rounded-xl bg-green-700 px-6 py-4 font-semibold text-white shadow-md transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
        >
            <FaWhatsapp className="h-5 w-5" />
            <Editable k="aulas.cta">Falar sobre as aulas</Editable>
        </a>
    );
}
