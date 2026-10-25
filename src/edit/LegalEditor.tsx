"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { RichTextEditor, type LexicalDoc } from "@/editor/RichTextEditor";
import { ApiError, api, errorMessage } from "@/admin/lib/adminFetch";
import { useMediaPicker } from "@/admin/components/MediaPicker";
import { useEdit } from "./EditContext";

type Flag = { rule: string; match: string; message: string };

/** Inline editor for a legal page; Salvar puts it live (CFP lint applies), "Voltar ao texto original" drops the override. */
export function LegalEditor({ k, doc, html }: { k: string; doc?: LexicalDoc; html?: string }) {
    const router = useRouter();
    const { texts, setText } = useEdit();
    const current = useRef<LexicalDoc | null>(doc ?? null);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [flags, setFlags] = useState<Flag[] | null>(null);
    const [ack, setAck] = useState(false);
    const [picker, pick] = useMediaPicker([]);
    const version = texts[k]?.version ?? 0;

    async function save(acknowledgeLint: boolean) {
        if (!current.current) return;
        setBusy(true);
        try {
            const res = await api<{ version: number }>(`/texts/${encodeURIComponent(k)}`, {
                method: "PUT",
                headers: { "If-Match": String(version) },
                json: { value: current.current, acknowledgeLint },
            });
            setText(k, { value: current.current, version: res.version });
            setDirty(false);
            setFlags(null);
            setAck(false);
            toast.success("Publicado");
            router.refresh();
        } catch (e) {
            if (e instanceof ApiError && e.status === 422) setFlags((e.body as { flags: Flag[] }).flags);
            else toast.error(e instanceof ApiError && e.status === 412 ? "Este texto foi alterado em outra aba. Recarregue a página." : errorMessage(e));
        } finally {
            setBusy(false);
        }
    }

    async function reset() {
        if (!confirm("Voltar ao texto original do site? As suas alterações nesta página serão descartadas.")) return;
        setBusy(true);
        try {
            await api(`/texts/${encodeURIComponent(k)}`, { method: "DELETE" });
            setText(k, null);
            window.location.reload();
        } catch (e) {
            toast.error(errorMessage(e));
            setBusy(false);
        }
    }

    return (
        <div>
            <div className="sticky z-[55] mb-6 flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-white/95 px-3 py-2 text-sm shadow-sm backdrop-blur" style={{ top: "calc(var(--admin-bar-h, 0px) + 4.25rem)" }}>
                <span className="mr-auto text-slate-600">{texts[k] ? "Texto editado" : "Texto original do site"}{dirty ? " · alterações não salvas" : ""}</span>
                {texts[k] && <Button size="sm" variant="outline" disabled={busy} onClick={reset}>Voltar ao texto original</Button>}
                <Button size="sm" disabled={busy || !dirty} onClick={() => save(false)}>Salvar e publicar</Button>
            </div>
            <div className="prose prose-slate max-w-none text-slate-700">
                <RichTextEditor inline value={doc ?? null} initialHtml={html} media={[]} onPickImage={pick} onChange={(d) => { current.current = d; setDirty(true); }} />
            </div>
            {picker}
            <Toaster />
            <Dialog open={!!flags} onOpenChange={(o) => !busy && !o && setFlags(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revise antes de publicar</DialogTitle>
                        <DialogDescription>O texto contém trechos que podem ferir a Resolução CFP 010/2005 (publicidade).</DialogDescription>
                    </DialogHeader>
                    <ul className="list-disc space-y-1 pl-5 text-sm">{(flags ?? []).map((f, i) => <li key={i}><strong>“{f.match}”</strong> — {f.message}</li>)}</ul>
                    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} /> Revisei os pontos acima e quero publicar mesmo assim.</label>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFlags(null)} disabled={busy}>Voltar e editar</Button>
                        <Button disabled={!ack || busy} onClick={() => save(true)}>Publicar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
