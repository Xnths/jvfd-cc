"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";

type FormState = "idle" | "submitting" | "error";

export function RegisterForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [lgpdConsent, setLgpdConsent] = useState(false);
    const [newsletter, setNewsletter] = useState(false);
    const [state, setState] = useState<FormState>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const canSubmit =
        name.trim().length >= 2 &&
        email.includes("@") &&
        password.length >= 8 &&
        password === confirmPassword &&
        lgpdConsent &&
        state !== "submitting";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        if (password !== confirmPassword) {
            setErrorMsg("As senhas não coincidem.");
            return;
        }

        setState("submitting");
        setErrorMsg("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    email,
                    password,
                    lgpdConsent: true,
                    subscribeNewsletter: newsletter,
                }),
            });

            const data = await res.json();

            if (res.status === 201) {
                posthog.capture("user_registered", { subscribeNewsletter: newsletter });
                sendGAEvent("event", "sign_up", { method: "email" });
                router.push("/login?registered=1");
            } else if (res.status === 409) {
                setErrorMsg("Este e-mail já está cadastrado.");
                setState("error");
            } else {
                setErrorMsg(data.error ?? "Erro ao criar conta.");
                setState("error");
            }
        } catch {
            setErrorMsg("Erro de conexão. Tente novamente.");
            setState("error");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
                    <p className="text-slate-500 text-sm mt-1">Para comentar nos artigos do blog</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="reg-name" className="text-sm font-medium text-slate-700">
                            Nome de exibição <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="reg-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Como você quer ser chamado(a)"
                            required
                            autoComplete="name"
                            disabled={state === "submitting"}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50"
                        />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="reg-email" className="text-sm font-medium text-slate-700">
                            E-mail <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="reg-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                            autoComplete="email"
                            disabled={state === "submitting"}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50"
                        />
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="reg-password" className="text-sm font-medium text-slate-700">
                            Senha <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="reg-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            required
                            autoComplete="new-password"
                            disabled={state === "submitting"}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50"
                        />
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="reg-confirm" className="text-sm font-medium text-slate-700">
                            Confirmar senha <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="reg-confirm"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repita a senha"
                            required
                            autoComplete="new-password"
                            disabled={state === "submitting"}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50"
                        />
                        {confirmPassword && password !== confirmPassword && (
                            <p className="text-xs text-red-500">As senhas não coincidem.</p>
                        )}
                    </div>

                    {/* LGPD consent — required */}
                    <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                        <input
                            type="checkbox"
                            checked={lgpdConsent}
                            onChange={(e) => setLgpdConsent(e.target.checked)}
                            required
                            disabled={state === "submitting"}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-green-600 shrink-0"
                        />
                        <span className="text-slate-600 text-xs leading-relaxed">
                            Li e concordo com a{" "}
                            <Link href="/politica-de-privacidade" target="_blank" className="text-blue-600 hover:underline font-medium">
                                Política de Privacidade
                            </Link>
                            . Autorizo o armazenamento dos meus dados para participação nos comentários do blog.{" "}
                            <span className="text-red-500">*</span>
                        </span>
                    </label>

                    {/* Newsletter — optional */}
                    <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={newsletter}
                            onChange={(e) => setNewsletter(e.target.checked)}
                            disabled={state === "submitting"}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-green-600 shrink-0"
                        />
                        <span className="text-slate-600 text-xs leading-relaxed">
                            Quero receber novidades do blog por e-mail. (opcional)
                        </span>
                    </label>

                    {errorMsg && (
                        <p className="text-sm text-red-600 font-medium" role="alert">{errorMsg}</p>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="mt-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {state === "submitting" ? "Criando conta…" : "Criar conta"}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                    Já tem conta?{" "}
                    <Link href="/login" className="text-green-600 font-medium hover:underline">
                        Entrar
                    </Link>
                </p>
            </div>
        </div>
    );
}
