"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor, type LexicalDoc } from "@/editor/RichTextEditor";
import type { MediaRef } from "@/editor/UploadNode";
import { ApiError, api, errorMessage } from "@/admin/lib/adminFetch";
import { useMediaPicker } from "@/admin/components/MediaPicker";
import { Toaster } from "@/components/ui/sonner";

type Flag = { rule: string; match: string; message: string };
type MediaItem = MediaRef & { filename: string };
type PageResponse = { page: { status: string; draftVersion: number; publishedVersion: number }; serviceDraftBody: LexicalDoc | null };

/** The service page's text, edited in place; "Publicar" puts it live (with the CFP copy check). */
export function ServiceBodyEditor({ serviceId, pageId }: { serviceId: string; pageId: string }) {
    const router = useRouter();
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [initial, setInitial] = useState<LexicalDoc | null | undefined>(undefined);
    const [status, setStatus] = useState("draft");
    const doc = useRef<LexicalDoc | null>(null);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [flags, setFlags] = useState<Flag[] | null>(null);
    const [ack, setAck] = useState(false);
    const [picker, pick] = useMediaPicker(media);

    const load = useCallback(async () => {
        try {
            const [p, m] = await Promise.all([api<PageResponse>(`/pages/${pageId}`), api<{ media: MediaItem[] }>("/media")]);
            setMedia(m.media);
            doc.current = p.serviceDraftBody;
            setInitial(p.serviceDraftBody);
            setStatus(p.page.status);
            setDirty(false);
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }, [pageId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    async function saveBody() {
        if (doc.current) await api(`/services/${serviceId}/body`, { method: "PUT", json: doc.current });
        setDirty(false);
    }

    async function run(fn: () => Promise<void>) {
        setBusy(true);
        try {
            await fn();
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(false);
        }
    }

    const saveDraft = () => run(async () => { await saveBody(); toast.success("Rascunho salvo"); });

    const publish = (acknowledgeLint: boolean) =>
        run(async () => {
            await saveBody();
            try {
                await api(`/pages/${pageId}/publish`, { method: "POST", json: { acknowledgeLint } });
                toast.success("Publicado");
                setFlags(null);
                setAck(false);
                setStatus("published");
                router.refresh();
            } catch (e) {
                if (e instanceof ApiError && e.status === 422 && (e.body as { flags?: Flag[] })?.flags) setFlags((e.body as { flags: Flag[] }).flags);
                else throw e;
            }
        });

    if (initial === undefined) return <p className="py-8 text-center text-slate-500">Carregando editor…</p>;
    return (
        <div>
            <div className="sticky z-[55] mb-6 flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-white/95 px-3 py-2 text-sm shadow-sm backdrop-blur" style={{ top: "calc(var(--admin-bar-h, 0px) + 4.25rem)" }}>
                <span className="mr-auto text-slate-600">{status === "published" ? "Publicado" : "Rascunho"}{dirty ? " · alterações não salvas" : ""}</span>
                <Button size="sm" variant="outline" disabled={busy || !dirty} onClick={saveDraft}>Salvar rascunho</Button>
                <Button size="sm" disabled={busy} onClick={() => publish(false)}>{status === "published" ? "Publicar alterações" : "Publicar"}</Button>
            </div>
            <RichTextEditor
                inline
                value={initial}
                media={media}
                onChange={(d) => { doc.current = d; setDirty(true); }}
                onPickImage={pick}
            />
            {picker}
            <Toaster />
            <Dialog open={!!flags} onOpenChange={(o) => !busy && !o && setFlags(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revise antes de publicar</DialogTitle>
                        <DialogDescription>O texto contém trechos que podem ferir a Resolução CFP 010/2005 (publicidade).</DialogDescription>
                    </DialogHeader>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                        {(flags ?? []).map((f, i) => <li key={i}><strong>“{f.match}”</strong> — {f.message}</li>)}
                    </ul>
                    <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                        Revisei os pontos acima e quero publicar mesmo assim.
                    </label>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFlags(null)} disabled={busy}>Voltar e editar</Button>
                        <Button disabled={!ack || busy} onClick={() => publish(true)}>Publicar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
