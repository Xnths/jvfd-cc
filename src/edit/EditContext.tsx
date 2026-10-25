"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { TextEntry, TextMap } from "@/lib/texts";

type Ctx = {
    texts: TextMap;
    admin: boolean;
    editing: boolean;
    setEditing: (v: boolean) => void;
    activeKey: string | null;
    setActiveKey: (k: string | null) => void;
    setText: (key: string, entry: TextEntry | null) => void;
};

const EditContext = createContext<Ctx>({
    texts: {},
    admin: false,
    editing: false,
    setEditing: () => {},
    activeKey: null,
    setActiveKey: () => {},
    setText: () => {},
});

export const useEdit = () => useContext(EditContext);

// The admin bar is only downloaded for signed-in admins: visitors never fetch it.
const AdminBar = dynamic(() => import("./AdminBar").then((m) => m.AdminBar), { ssr: false });

function hasAdminHint() {
    try {
        return document.cookie.split("; ").some((c) => c === "clinic_admin=1");
    } catch {
        return false;
    }
}

export function EditProvider({ initial, children }: { initial: TextMap; children: React.ReactNode }) {
    const [texts, setTexts] = useState<TextMap>(initial);
    const [admin, setAdmin] = useState(false);
    const [editing, setEditingState] = useState(false);
    const [activeKey, setActiveKey] = useState<string | null>(null);

    // Server re-renders (router.refresh, revalidation) deliver fresh overrides.
    useEffect(() => setTexts(initial), [initial]);

    useEffect(() => {
        if (!hasAdminHint()) return;
        setAdmin(true);
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get("edit") === "1") {
                sessionStorage.setItem("clinic_edit", "1");
                url.searchParams.delete("edit");
                window.history.replaceState(null, "", url.pathname + url.search + url.hash);
            }
            if (sessionStorage.getItem("clinic_edit") === "1") setEditingState(true);
        } catch {
            /* storage blocked: the toggle still works for this page view */
        }
    }, []);

    const setEditing = useCallback((v: boolean) => {
        setEditingState(v);
        if (!v) setActiveKey(null);
        try {
            if (v) sessionStorage.setItem("clinic_edit", "1");
            else sessionStorage.removeItem("clinic_edit");
        } catch {
            /* ignore */
        }
    }, []);

    const setText = useCallback((key: string, entry: TextEntry | null) => {
        setTexts((prev) => {
            const next = { ...prev };
            if (entry) next[key] = entry;
            else delete next[key];
            return next;
        });
    }, []);

    // While editing, a click on any editable text edits it instead of following links or firing CTAs.
    useEffect(() => {
        if (!editing) return;
        const onClick = (e: MouseEvent) => {
            const hit = (e.target as Element | null)?.closest?.("[data-edit-key]");
            if (!hit) return;
            e.preventDefault();
            e.stopPropagation();
            setActiveKey(hit.getAttribute("data-edit-key"));
        };
        window.addEventListener("click", onClick, true);
        return () => window.removeEventListener("click", onClick, true);
    }, [editing]);

    const value = useMemo(
        () => ({ texts, admin, editing, setEditing, activeKey, setActiveKey, setText }),
        [texts, admin, editing, setEditing, activeKey, setText],
    );

    return (
        <EditContext.Provider value={value}>
            {children}
            {admin && <AdminBar />}
        </EditContext.Provider>
    );
}
