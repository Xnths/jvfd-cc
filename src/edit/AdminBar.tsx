"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEdit } from "./EditContext";

type Me = { id: string; email: string; name?: string; role: string };
export const ADMIN_BAR_HEIGHT = 44;

/** Fixed bar above the real site for signed-in admins. */
export function AdminBar() {
    const { editing, setEditing } = useEdit();
    const pathname = usePathname();
    const [me, setMe] = useState<Me | null>(null);

    useEffect(() => {
        // Quiet check: a stale hint cookie must never bounce a public visitor to the login page.
        const me = () => fetch("/api/v1/admin/me", { credentials: "same-origin" });
        (async () => {
            try {
                let res = await me();
                if (res.status === 401 && (await fetch("/auth/refresh", { method: "POST", credentials: "same-origin" })).ok) res = await me();
                setMe(res.ok ? ((await res.json()) as Me) : null);
            } catch {
                setMe(null);
            }
        })();
    }, []);

    useEffect(() => {
        if (!me) return;
        document.documentElement.style.setProperty("--admin-bar-h", `${ADMIN_BAR_HEIGHT}px`);
        document.documentElement.dataset.adminBar = "1";
        return () => {
            document.documentElement.style.removeProperty("--admin-bar-h");
            delete document.documentElement.dataset.adminBar;
        };
    }, [me]);

    useEffect(() => {
        document.documentElement.dataset.editing = editing ? "1" : "0";
    }, [editing]);

    if (!me) return null;
    return (
        <div
            style={{ height: ADMIN_BAR_HEIGHT }}
            className="fixed inset-x-0 top-0 z-[99999] flex items-center gap-3 bg-slate-900 px-4 text-sm text-white shadow"
            data-admin-bar
        >
            <span className="hidden font-semibold sm:inline">Modo administrador</span>
            <button
                type="button"
                onClick={() => setEditing(!editing)}
                aria-pressed={editing}
                className={`rounded px-3 py-1 font-medium ${editing ? "bg-green-600 hover:bg-green-700" : "bg-white/10 hover:bg-white/20"}`}
            >
                {editing ? "Editando: clique num texto" : "Editar página"}
            </button>
            <span className="mx-auto" />
            <Link href="/admin" className="rounded px-2 py-1 hover:bg-white/10">
                Painel
            </Link>
            <span className="hidden text-white/60 md:inline" title={pathname}>
                {me.email} ({me.role === "clinical" ? "clínico" : "técnico"})
            </span>
        </div>
    );
}
