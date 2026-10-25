"use client";

import { useState } from "react";
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/Turnstile";
import { Editable } from "@/edit/Editable";

/** Anonymous question box for /perguntas. No name, e-mail or phone is collected. */
export function QuestionForm() {
    const [question, setQuestion] = useState("");
    const [website, setWebsite] = useState(""); // honeypot
    const [token, setToken] = useState("");
    const [reset, setReset] = useState(0);
    const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
    const [error, setError] = useState("");

    if (!TURNSTILE_SITE_KEY) {
        return <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">O envio de perguntas está temporariamente fechado.</p>;
    }
    if (state === "done") {
        return <p className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">Pergunta recebida. Se ela for respondida, aparecerá aqui, sem identificar quem perguntou.</p>;
    }
    const can = question.trim().length >= 10 && !!token && state !== "sending";

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!can) return;
        setState("sending");
        setError("");
        try {
            const res = await fetch("/api/v1/public/faq-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, website, turnstileToken: token }),
            });
            if (res.status === 202) return setState("done");
            const data = await res.json().catch(() => ({}));
            setError(data.detail ?? data.title ?? "Não foi possível enviar. Tente novamente.");
            setState("error");
        } catch {
            setError("Erro de conexão. Tente novamente.");
            setState("error");
        }
        setToken("");
        setReset((n) => n + 1);
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-3">
            <label htmlFor="q" className="text-sm font-medium text-slate-700"><Editable k="questions.form_label">Sua pergunta</Editable></label>
            <textarea id="q" value={question} onChange={(e) => { setQuestion(e.target.value); setState("idle"); }} rows={4} maxLength={1000}
                className="resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20" />
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden"><label>Não preencha<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
            <Turnstile onToken={setToken} resetKey={reset} />
            <button type="submit" disabled={!can} className="self-start rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                {state === "sending" ? "Enviando…" : "Enviar pergunta"}
            </button>
            <p className="text-xs text-slate-500">
                <Editable k="questions.form_note" multiline>Não escreva seu nome, telefone ou detalhes que identifiquem você ou outras pessoas. Isto não é um canal de atendimento nem de urgência: em crise, ligue 188 (CVV) ou 192 (SAMU).</Editable>
            </p>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </form>
    );
}
