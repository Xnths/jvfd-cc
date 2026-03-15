"use client";

import { FaInstagram } from "react-icons/fa";
import posthog from "posthog-js";

export function SoftCta() {
    return (
        <section className="py-12 bg-white border-b border-slate-100" id="soft-cta">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto text-center">
                    <p className="text-slate-600 text-lg mb-4">
                        Ainda não quer conversar? Tudo bem. Acompanhe conteúdos sobre saúde mental:
                    </p>
                    <a
                        href="https://www.instagram.com/ciencia_comportamental_"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => posthog.capture("instagram_follow_clicked", { source: "soft_cta" })}
                        className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold text-lg transition-colors group"
                    >
                        <FaInstagram className="w-6 h-6" />
                        <span className="group-hover:underline">@ciencia_comportamental_</span>
                    </a>
                </div>
            </div>
        </section>
    );
}
