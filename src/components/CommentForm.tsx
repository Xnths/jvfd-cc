"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";

interface CommentFormProps {
    postId: string;
}

type FormState = "idle" | "submitting" | "success" | "error";

declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, opts: Record<string, unknown>) => string;
            reset: (id?: string) => void;
        };
    }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function CommentForm({ postId }: CommentFormProps) {
    const [name, setName] = useState("");
    const [body, setBody] = useState("");
    const [website, setWebsite] = useState(""); // honeypot: real visitors never see it
    const [token, setToken] = useState("");
    const [state, setState] = useState<FormState>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const widget = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!SITE_KEY || !widget.current) return;
        const mount = () => {
            if (!window.turnstile || !widget.current || widgetId.current) return;
            widgetId.current = window.turnstile.render(widget.current, {
                sitekey: SITE_KEY,
                callback: (t: string) => setToken(t),
                "expired-callback": () => setToken(""),
            });
        };
        if (window.turnstile) return mount();
        const existing = document.getElementById("turnstile-script");
        if (existing) {
            existing.addEventListener("load", mount);
            return;
        }
        const s = document.createElement("script");
        s.id = "turnstile-script";
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.onload = mount;
        document.head.appendChild(s);
    }, []);

    if (!SITE_KEY) {
        return (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
                Os comentários estão temporariamente fechados para novos envios.
            </p>
        );
    }

    if (state === "success") {
        return (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
                ✅ Comentário enviado para moderação. Ele aparecerá após aprovação.
            </div>
        );
    }

    const canSubmit = name.trim().length >= 2 && body.trim().length >= 1 && !!token && state !== "submitting";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setState("submitting");
        setErrorMsg("");

        try {
            const res = await fetch("/api/v1/public/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, name, body, website, turnstileToken: token }),
            });

            if (res.status === 202) {
                posthog.capture("comment_submitted", { post_id: postId });
                sendGAEvent("event", "comment_submitted", { post_id: postId });
                setState("success");
                setBody("");
                return;
            }
            const data = await res.json().catch(() => ({}));
            setErrorMsg(data.detail ?? data.title ?? "Erro ao enviar. Tente novamente.");
            setState("error");
        } catch {
            setErrorMsg("Erro de conexão. Tente novamente.");
            setState("error");
        }
        // A Turnstile token is single use.
        setToken("");
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
    };

    const field =
        "rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="comment-name" className="text-sm font-medium text-slate-700">Seu nome</label>
            <input
                id="comment-name"
                value={name}
                onChange={(e) => { setName(e.target.value); setState("idle"); }}
                maxLength={80}
                autoComplete="given-name"
                disabled={state === "submitting"}
                className={field}
            />
            <label htmlFor="comment-body" className="text-sm font-medium text-slate-700">Comentário</label>
            <textarea
                id="comment-body"
                value={body}
                onChange={(e) => { setBody(e.target.value); setState("idle"); }}
                placeholder="Escreva seu comentário…"
                rows={4}
                maxLength={2000}
                disabled={state === "submitting"}
                className={`${field} resize-none`}
            />
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label>
                    Não preencha este campo
                    <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
            </div>
            <div ref={widget} />
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{body.length}/2000</span>
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                    {state === "submitting" ? "Enviando…" : "Enviar comentário"}
                </button>
            </div>
            <p className="text-xs text-slate-500">
                Comentários são moderados antes de aparecer. Não compartilhe informações pessoais ou de saúde.
            </p>
            {errorMsg && (
                <p className="text-sm text-red-600" role="alert">{errorMsg}</p>
            )}
        </form>
    );
}
