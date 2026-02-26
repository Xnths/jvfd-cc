"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AccountPageProps {
    user: {
        id: string;
        name: string;
        email: string;
        subscribedToNewsletter: boolean;
    };
}

export function AccountPage({ user }: AccountPageProps) {
    const router = useRouter();
    const [newsletter, setNewsletter] = useState(user.subscribedToNewsletter);
    const [newsletterLoading, setNewsletterLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");

    const handleNewsletterToggle = async () => {
        setNewsletterLoading(true);
        const newValue = !newsletter;
        try {
            const res = await fetch("/api/account/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscribe: newValue }),
            });
            if (res.ok) {
                setNewsletter(newValue);
                setStatusMsg(newValue ? "Inscrito na newsletter." : "Removido da newsletter.");
            } else {
                setStatusMsg("Erro ao atualizar preferência.");
            }
        } catch {
            setStatusMsg("Erro de conexão.");
        }
        setNewsletterLoading(false);
        setTimeout(() => setStatusMsg(""), 3000);
    };

    const handleExport = () => {
        window.location.href = "/api/account/export";
    };

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        try {
            const res = await fetch("/api/account/delete", { method: "DELETE" });
            if (res.ok) {
                router.push("/");
                router.refresh();
            } else {
                setStatusMsg("Erro ao excluir conta.");
                setDeleteLoading(false);
                setShowDeleteConfirm(false);
            }
        } catch {
            setStatusMsg("Erro de conexão.");
            setDeleteLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-16 px-4">
            <div className="max-w-lg mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-slate-900">Minha conta</h1>

                {/* User info card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Dados pessoais</h2>
                    <div>
                        <p className="text-xs text-slate-400">Nome</p>
                        <p className="text-slate-900 font-medium">{user.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">E-mail</p>
                        <p className="text-slate-900">{user.email}</p>
                    </div>
                </div>

                {/* Newsletter toggle */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Newsletter</h2>
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-slate-700">Receber novidades do blog por e-mail</span>
                        <button
                            role="switch"
                            aria-checked={newsletter}
                            onClick={handleNewsletterToggle}
                            disabled={newsletterLoading}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-600/30 disabled:opacity-50 ${newsletter ? "bg-green-600" : "bg-slate-300"
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newsletter ? "translate-x-6" : "translate-x-1"
                                    }`}
                            />
                        </button>
                    </label>
                    {statusMsg && (
                        <p className="text-xs text-slate-500 mt-2" role="status">{statusMsg}</p>
                    )}
                </div>

                {/* LGPD actions */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Privacidade (LGPD)</h2>
                    <p className="text-xs text-slate-500">
                        Conforme{" "}
                        <Link href="/politica-de-privacidade" target="_blank" className="text-blue-600 hover:underline">
                            nossa Política de Privacidade
                        </Link>
                        , você tem direito de exportar ou excluir seus dados.
                    </p>

                    <button
                        onClick={handleExport}
                        className="w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                        ⬇️ Baixar meus dados (JSON)
                    </button>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                            🗑️ Excluir minha conta
                        </button>
                    ) : (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                            <p className="text-sm text-red-700 font-medium">Tem certeza? Esta ação é irreversível.</p>
                            <p className="text-xs text-red-600">
                                Seus comentários serão anonimizados e sua conta será excluída permanentemente.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteLoading}
                                    className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                    {deleteLoading ? "Excluindo…" : "Sim, excluir conta"}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                    Sair da conta
                </button>
            </div>
        </div>
    );
}
