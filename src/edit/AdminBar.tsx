"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, errorMessage } from "@/admin/lib/adminFetch";
import { useEdit } from "./EditContext";

type Me = { id: string; email: string; name?: string; role: string };
export const ADMIN_BAR_HEIGHT = 44;

const NewServiceDialog = dynamic(() => import("./ServiceDialogs").then((m) => m.NewServiceDialog), { ssr: false });
const ServiceSettingsDialog = dynamic(() => import("./ServiceDialogs").then((m) => m.ServiceSettingsDialog), { ssr: false });

// One-segment paths owned by code, never services.
const CODE_PAGES = new Set(["blog", "presencial", "aulas-particulares", "politica-de-privacidade", "termos-de-uso", "admin", "edit", "auth"]);

/** Fixed bar above the real site for signed-in admins. */
export function AdminBar() {
    const { editing, setEditing } = useEdit();
    const pathname = usePathname();
    const [me, setMe] = useState<Me | null>(null);
    const [creating, setCreating] = useState(false);
    const [newServiceOpen, setNewServiceOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [serviceSlug, setServiceSlug] = useState<string | null>(null);

    // On a service page (published or draft) the bar offers its settings.
    useEffect(() => {
        const m = /^\/([a-z0-9-]+)$/.exec(pathname ?? "");
        setServiceSlug(null);
        if (!me || !m || CODE_PAGES.has(m[1])) return;
        fetch(`/api/v1/admin/pages/slug:${m[1]}`, { credentials: "same-origin" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.service && setServiceSlug(m[1]))
            .catch(() => undefined);
    }, [pathname, me]);

    // A new post starts as a draft and opens on its real URL, ready to be written in place.
    async function newPost() {
        setCreating(true);
        try {
            const res = await api<{ slug: string }>("/posts", { method: "POST", json: { title: "Novo post" } });
            window.location.href = `/edit/enter?return=${encodeURIComponent(`/blog/${res.slug}`)}`;
        } catch (e) {
            alert(errorMessage(e));
            setCreating(false);
        }
    }

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
            <button type="button" onClick={newPost} disabled={creating} className="rounded px-3 py-1 font-medium bg-white/10 hover:bg-white/20 disabled:opacity-50">
                + Novo post
            </button>
            <button type="button" onClick={() => setNewServiceOpen(true)} className="rounded px-3 py-1 font-medium bg-white/10 hover:bg-white/20">
                + Novo serviço
            </button>
            {serviceSlug && (
                <button type="button" onClick={() => setSettingsOpen(true)} className="rounded px-3 py-1 font-medium bg-white/10 hover:bg-white/20">
                    Configurar serviço
                </button>
            )}
            <span className="mx-auto" />
            <Link href="/admin" className="rounded px-2 py-1 hover:bg-white/10">
                Painel
            </Link>
            <span className="hidden text-white/60 md:inline" title={pathname}>
                {me.email} ({me.role === "clinical" ? "clínico" : "técnico"})
            </span>
            {newServiceOpen && <NewServiceDialog open onOpenChange={setNewServiceOpen} />}
            {settingsOpen && serviceSlug && <ServiceSettingsDialog open onOpenChange={setSettingsOpen} slug={serviceSlug} />}
        </div>
    );
}
