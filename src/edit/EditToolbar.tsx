"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/admin/lib/adminFetch";
import { useEdit } from "./EditContext";

type Flag = { rule: string; match: string; message: string };
type HistoryItem = { id: number; value: unknown; version: number; createdAt: string; by: string };

/** Cancelar / Salvar floating next to the text being edited. */
export function EditToolbar({
    k,
    anchor,
    multiline,
    fallback,
    onCancel,
    onSaved,
}: {
    k: string;
    anchor: RefObject<HTMLElement | null>;
    multiline: boolean;
    fallback: string;
    onCancel: () => void;
    onSaved: () => void;
}) {
    const { texts, setText } = useEdit();
    const router = useRouter();
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flags, setFlags] = useState<Flag[] | null>(null);
    const [history, setHistory] = useState<HistoryItem[] | null>(null);
    const version = texts[k]?.version ?? 0;

    useLayoutEffect(() => {
        const place = () => {
            const el = anchor.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const below = r.bottom + 8;
            const top = below + 120 > window.innerHeight ? Math.max(60, r.top - 52) : below;
            setPos({ top, left: Math.min(Math.max(8, r.left), window.innerWidth - 340) });
        };
        place();
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return () => {
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
        };
    }, [anchor]);

    useEffect(() => {
        setFlags(null);
        setError(null);
        setHistory(null);
    }, [k]);

    const read = () => {
        const raw = (anchor.current?.innerText ?? "").replace(/ /g, " ");
        return (multiline ? raw.replace(/\n{3,}/g, "\n\n") : raw.replace(/\s*\n\s*/g, " ")).trim();
    };

    async function save(acknowledgeLint = false) {
        const value = read();
        if (!value) {
            setError("O texto não pode ficar vazio. Use “Restaurar padrão” para voltar ao original.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const res = await api<{ version: number }>(`/texts/${encodeURIComponent(k)}`, {
                method: "PUT",
                headers: { "If-Match": String(version) },
                json: { value, acknowledgeLint },
            });
            setText(k, { value, version: res.version });
            onSaved();
            router.refresh();
        } catch (e) {
            if (e instanceof ApiError && e.status === 422) {
                setFlags((e.body as { flags: Flag[] }).flags);
            } else if (e instanceof ApiError && e.status === 412) {
                setError("Este texto foi alterado em outra aba. Recarregue a página.");
            } else {
                setError(e instanceof Error ? e.message : "Erro ao salvar");
            }
        } finally {
            setBusy(false);
        }
    }

    async function reset() {
        setBusy(true);
        try {
            await api(`/texts/${encodeURIComponent(k)}`, { method: "DELETE" });
            setText(k, null);
            onSaved();
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro");
        } finally {
            setBusy(false);
        }
    }

    async function openHistory() {
        try {
            const res = await api<{ history: HistoryItem[] }>(`/texts/${encodeURIComponent(k)}/history`);
            setHistory(res.history);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro");
        }
    }

    async function restore(id: number) {
        setBusy(true);
        try {
            const res = await api<{ version?: number; value?: unknown }>(`/texts/${encodeURIComponent(k)}/restore`, { method: "POST", json: { historyId: id } });
            if (res && res.value !== undefined && res.version) setText(k, { value: res.value, version: res.version });
            else setText(k, null);
            onSaved();
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro");
        } finally {
            setBusy(false);
        }
    }

    if (!pos) return null;
    const btn = "rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50";
    return createPortal(
        <div
            role="dialog"
            aria-label="Editar texto"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 330, zIndex: 100000 }}
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-900 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" data-edit-save className={`${btn} bg-green-700 text-white hover:bg-green-800`} disabled={busy} onClick={() => save(false)}>
                    Salvar
                </button>
                <button type="button" className={`${btn} border border-slate-300 hover:bg-slate-50`} disabled={busy} onClick={onCancel}>
                    Cancelar
                </button>
                <span className="mx-auto" />
                <button type="button" className={`${btn} text-slate-600 hover:bg-slate-50`} onClick={openHistory}>
                    Histórico
                </button>
                {texts[k] && (
                    <button type="button" className={`${btn} text-slate-600 hover:bg-slate-50`} disabled={busy} onClick={reset} title={`Voltar a: ${fallback}`}>
                        Padrão
                    </button>
                )}
            </div>
            {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
            {flags && (
                <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                    <p className="font-semibold">Revise antes de publicar (Res. CFP 010/2005):</p>
                    <ul className="ml-4 list-disc">
                        {flags.map((f, i) => (
                            <li key={i}>
                                “{f.match}”: {f.message}
                            </li>
                        ))}
                    </ul>
                    <button type="button" className={`${btn} mt-1 bg-amber-600 text-white`} onClick={() => save(true)}>
                        Salvar mesmo assim
                    </button>
                </div>
            )}
            {history && (
                <ul className="mt-2 max-h-48 divide-y divide-slate-100 overflow-auto text-xs">
                    {history.length === 0 && <li className="py-1 text-slate-500">Sem versões anteriores.</li>}
                    {history.map((h) => (
                        <li key={h.id} className="py-1.5">
                            <p className="text-slate-500">
                                {new Date(h.createdAt).toLocaleString("pt-BR")} {h.by && `· ${h.by}`}
                            </p>
                            <p className="line-clamp-2">{typeof h.value === "string" ? h.value : h.value == null ? "(padrão)" : "(lista)"}</p>
                            <button type="button" className="text-green-700 underline" onClick={() => restore(h.id)}>
                                Restaurar
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>,
        document.body,
    );
}
