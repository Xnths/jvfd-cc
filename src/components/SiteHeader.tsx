"use client";

import { trackWhatsappClick } from "@/lib/whatsapp-lead";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";
import { Logo } from "@/components/brand/Logo";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { Editable } from "@/edit/Editable";

const NAV = [
    { key: "services", href: "/#services", label: "Atendimentos" },
    { key: "tutoring", href: "/aulas-particulares", label: "Aulas" },
    { key: "about", href: "/#about", label: "Sobre" },
    { key: "blog", href: "/blog", label: "Blog" },
    { key: "contact", href: "/#contact", label: "Contato" },
];

export function SiteHeader() {
    const [open, setOpen] = useState(false);
    const whatsappUrl = useWhatsappUrl();
    const { getElapsedTime } = useTimeToAction();

    const onCtaClick = () => {
        const props = { source: "header", time_to_click_ms: getElapsedTime() || 0 };
        sendGAEvent("event", "schedule_click", props);
        posthog.capture("schedule_click", props);
        trackWhatsappClick("header");
    };

    return (
        <header className="sticky top-0 z-[60] border-b border-slate-200 bg-white/90 text-green-900 backdrop-blur">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" aria-label="João Fernandes, página inicial" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
                    <Logo size={36} />
                </Link>

                <nav aria-label="Principal" className="hidden items-center gap-7 text-sm font-medium text-slate-700 lg:flex">
                    {NAV.map((item) => (
                        <Link key={item.href} href={item.href} className="transition-colors hover:text-green-700">
                            <Editable k={`site.header.nav.${item.key}`}>{item.label}</Editable>
                        </Link>
                    ))}
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onCtaClick}
                        className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-800"
                    >
                        <FaWhatsapp className="h-4 w-4" />
                        <Editable k="site.header.cta">Agendar</Editable>
                    </a>
                </nav>

                <button
                    type="button"
                    className="rounded-md p-2 text-green-900 lg:hidden"
                    aria-expanded={open}
                    aria-controls="mobile-nav"
                    aria-label={open ? "Fechar menu" : "Abrir menu"}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {open && (
                <nav id="mobile-nav" aria-label="Principal" className="border-t border-slate-200 bg-white lg:hidden">
                    <ul className="container mx-auto flex flex-col px-4 py-2">
                        {NAV.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className="block py-3 text-base font-medium text-slate-800"
                                >
                                    <Editable k={`site.header.nav.${item.key}`}>{item.label}</Editable>
                                </Link>
                            </li>
                        ))}
                        <li className="py-3">
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onCtaClick}
                                className="flex items-center justify-center gap-2 rounded-md bg-green-700 px-4 py-3 font-semibold text-white"
                            >
                                <FaWhatsapp className="h-5 w-5" />
                                <Editable k="site.header.cta_mobile">Agendar pelo WhatsApp</Editable>
                            </a>
                        </li>
                    </ul>
                </nav>
            )}
        </header>
    );
}
