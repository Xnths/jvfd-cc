"use client";

import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import Link from "next/link";
import posthog from "posthog-js";
import { Editable } from "@/edit/Editable";

type FormState = "idle" | "submitting" | "success" | "duplicate" | "error";

export function NewsletterForm({ placement = "home", slug }: { placement?: "home" | "article"; slug?: string }) {
    const [email, setEmail] = useState("");
    const [consent, setConsent] = useState(false);
    const [state, setState] = useState<FormState>("idle");

    const canSubmit = email.includes("@") && consent && state !== "submitting";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setState("submitting");

        try {
            const res = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (res.status === 201) {
                setState("success");
                setEmail("");
                setConsent(false);
                sendGAEvent("event", "newsletter_subscribe", { source: "newsletter_form", placement, slug: slug ?? "" });
                posthog.capture("newsletter_subscribed", { source: "newsletter_form", placement, slug });
            } else if (res.status === 409) {
                setState("duplicate");
            } else {
                setState("error");
            }
        } catch {
            setState("error");
        }
    };

    const feedback: Record<Exclude<FormState, "idle" | "submitting">, string> = {
        success: "✅ Inscrição confirmada! Você receberá novidades do blog.",
        duplicate: "ℹ️ Este e-mail já está inscrito.",
        error: "❌ Algo deu errado. Tente novamente.",
    };

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-8">
            <Editable as="h3" k="newsletter.title" className="text-xl font-semibold text-slate-900 mb-1">
                Receba novidades do blog
            </Editable>
            <Editable as="p" k="newsletter.text" className="text-slate-600 mb-5 sm:mb-6 text-base sm:text-sm">
                Quando João publicar um novo artigo, você recebe no e-mail. Sem spam e cancele quando quiser.
            </Editable>

            {state !== "success" ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
                            disabled={state === "submitting"}
                            required
                            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-4 py-3 sm:py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50 text-base sm:text-sm"
                            autoComplete="email"
                            inputMode="email"
                            aria-label="Seu endereço de e-mail"
                        />
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="rounded-md bg-green-600 px-5 py-3 sm:py-2.5 text-base sm:text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                            {state === "submitting" ? "Enviando…" : "Inscrever"}
                        </button>
                    </div>

                    {/* LGPD consent */}
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            disabled={state === "submitting"}
                            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-green-600 sm:h-4 sm:w-4"
                            required
                        />
                        <span className="text-slate-600 text-sm sm:text-xs leading-relaxed">
                            Concordo com a{" "}
                            <Link
                                href="/politica-de-privacidade"
                                target="_blank"
                                className="text-blue-600 hover:underline font-medium"
                            >
                                Política de Privacidade
                            </Link>{" "}
                            e autorizo o recebimento de novidades do blog de João Vitor Fernandes Domingues, Psicólogo (CRP 06/157908).
                        </span>
                    </label>

                    {state === "idle" && !canSubmit && (email.length > 0 || consent) && (
                        <p className="text-sm sm:text-xs text-slate-600">
                            {!email.includes("@") ? "Digite um e-mail válido para continuar." : "Marque a caixa de concordância para continuar."}
                        </p>
                    )}

                    {state !== "idle" && state !== "submitting" && (
                        <p className="text-sm" role="alert">{feedback[state]}</p>
                    )}
                </form>
            ) : (
                <p className="text-sm text-green-700 font-medium" role="status">
                    {feedback.success}
                </p>
            )}
        </div>
    );
}
