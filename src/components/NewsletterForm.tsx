"use client";

import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import Link from "next/link";

type FormState = "idle" | "submitting" | "success" | "duplicate" | "error";

export function NewsletterForm() {
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
                sendGAEvent("event", "newsletter_subscribe", { source: "newsletter_form" });
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
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-1">
                Receba novidades do blog
            </h3>
            <p className="text-slate-600 mb-6 text-sm">
                Quando João publicar um novo artigo, você recebe no e-mail. Sem spam e cancele quando quiser.
            </p>

            {state !== "success" ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
                            disabled={state === "submitting"}
                            required
                            className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50 text-sm"
                            aria-label="Seu endereço de e-mail"
                        />
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="rounded-md bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                            {state === "submitting" ? "Enviando…" : "Inscrever"}
                        </button>
                    </div>

                    {/* LGPD consent */}
                    <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            disabled={state === "submitting"}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-green-600"
                            required
                        />
                        <span className="text-slate-500 text-xs leading-relaxed">
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
