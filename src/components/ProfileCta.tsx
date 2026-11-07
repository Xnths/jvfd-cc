"use client";

import { FaWhatsapp } from "react-icons/fa";
import { sendGAEvent } from "@next/third-parties/google";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { trackWhatsappClick } from "@/lib/whatsapp-lead";
import { Editable } from "@/edit/Editable";

export function ProfileCta() {
    const url = useWhatsappUrl();
    const onClick = () => {
        sendGAEvent("event", "schedule_click", { source: "profile_cta" });
        trackWhatsappClick("profile_cta");
    };
    return (
        <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClick}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-8 py-4 text-lg font-bold text-white hover:bg-green-700"
            >
                <FaWhatsapp className="h-6 w-6" aria-hidden="true" />
                <Editable k="profile.cta.button">Agendar sessão pelo WhatsApp</Editable>
            </a>
            <Editable as="p" k="profile.cta.note" multiline className="mt-3 text-sm text-slate-600">
                Psicoterapia particular para adultos, online ou presencial. Não atende convênio; emite recibo para reembolso. Valores informados pelo WhatsApp. Menores de 18 anos: contato por um responsável.
            </Editable>
        </section>
    );
}
