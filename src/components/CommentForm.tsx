"use client";

import { useState } from "react";
import Link from "next/link";

interface CommentFormProps {
    postId: string;
    user: { id: string; name: string } | null;
}

type FormState = "idle" | "submitting" | "success" | "error";

export function CommentForm({ postId, user }: CommentFormProps) {
    const [body, setBody] = useState("");
    const [state, setState] = useState<FormState>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    if (!user) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
                <Link href="/login" className="text-green-600 font-medium hover:underline">
                    Faça login
                </Link>{" "}
                ou{" "}
                <Link href="/registro" className="text-green-600 font-medium hover:underline">
                    cadastre-se
                </Link>{" "}
                para deixar um comentário.
            </div>
        );
    }

    if (state === "success") {
        return (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
                ✅ Comentário enviado para moderação. Ele aparecerá após aprovação.
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (body.trim().length < 1 || state === "submitting") return;

        setState("submitting");
        setErrorMsg("");

        try {
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, body }),
            });

            const data = await res.json();

            if (res.status === 201) {
                setState("success");
                setBody("");
            } else if (res.status === 401) {
                setErrorMsg("Sua sessão expirou. Faça login novamente.");
                setState("error");
            } else {
                setErrorMsg(data.error ?? "Erro ao enviar. Tente novamente.");
                setState("error");
            }
        } catch {
            setErrorMsg("Erro de conexão. Tente novamente.");
            setState("error");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="comment-body" className="text-sm font-medium text-slate-700">
                Comentar como <span className="text-slate-500 font-normal">{user.name}</span>
            </label>
            <textarea
                id="comment-body"
                value={body}
                onChange={(e) => { setBody(e.target.value); setState("idle"); }}
                placeholder="Escreva seu comentário…"
                rows={4}
                maxLength={2000}
                disabled={state === "submitting"}
                className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 resize-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{body.length}/2000</span>
                <button
                    type="submit"
                    disabled={body.trim().length < 1 || state === "submitting"}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                    {state === "submitting" ? "Enviando…" : "Enviar comentário"}
                </button>
            </div>
            {errorMsg && (
                <p className="text-sm text-red-600" role="alert">{errorMsg}</p>
            )}
        </form>
    );
}
