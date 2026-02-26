"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type FormState = "idle" | "submitting" | "error";

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get("registered") === "1";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [state, setState] = useState<FormState>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const canSubmit = email.includes("@") && password.length >= 1 && state !== "submitting";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setState("submitting");
        setErrorMsg("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                router.push("/blog");
                router.refresh();
            } else {
                const data = await res.json();
                setErrorMsg(data.error ?? "E-mail ou senha inválidos.");
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
                    <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
                    <p className="text-slate-500 text-sm mt-1">Acesse sua conta para comentar</p>
                </div>

                {registered && (
                    <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                        ✅ Conta criada com sucesso! Faça login para continuar.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="login-email" className="text-sm font-medium text-slate-700">
                            E-mail
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                            autoComplete="email"
                            autoFocus
                            disabled={state === "submitting"}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                            Senha
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Sua senha"
                            required
                            autoComplete="current-password"
                            disabled={state === "submitting"}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20 disabled:opacity-50"
                        />
                    </div>

                    {errorMsg && (
                        <p className="text-sm text-red-600 font-medium" role="alert">{errorMsg}</p>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="mt-1 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {state === "submitting" ? "Entrando…" : "Entrar"}
                    </button>
                </form>

                <div className="flex flex-col items-center gap-2 mt-6 text-sm text-slate-500">
                    <p>
                        Não tem conta?{" "}
                        <Link href="/registro" className="text-green-600 font-medium hover:underline">
                            Criar conta
                        </Link>
                    </p>
                    <a
                        href="/api/blog-users/forgot-password"
                        className="text-slate-400 hover:text-slate-600 text-xs hover:underline"
                    >
                        Esqueci minha senha
                    </a>
                </div>
            </div>
        </div>
    );
}
