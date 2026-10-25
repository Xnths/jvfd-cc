"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor, type LexicalDoc } from "@/editor/RichTextEditor";
import { api, errorMessage } from "@/admin/lib/adminFetch";
import { useMediaPicker } from "@/admin/components/MediaPicker";
import { InlineText } from "./InlineText";

type Term = {
    id: string;
    slug: string;
    term: string;
    altNames: string[];
    shortDefinition: string;
    body: LexicalDoc | null;
    sources: string[] | null;
    status: "draft" | "published";
    reviewedByProfileId: string | null;
};
type ProfileRow = { id: string; displayName: string; isClinician: boolean };

/** Glossary term page, editable in place. Publishing needs a definition and a clinician reviewer. */
export function TermEditor({ termRef }: { termRef: string }) {
    const router = useRouter();
    const [t, setT] = useState<Term | null>(null);
    const [profiles, setProfiles] = useState<ProfileRow[]>([]);
    const body = useRef<LexicalDoc | null>(null);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [picker, pick] = useMediaPicker([]);

    const load = useCallback(async () => {
        try {
            const [list, prof] = await Promise.all([api<{ terms: Term[] }>("/glossary"), api<{ profiles: ProfileRow[] }>("/profiles")]);
            const found = list.terms.find((x) => x.slug === termRef);
            if (!found) throw new Error("Termo não encontrado");
            body.current = found.body;
            setT({ ...found, sources: Array.isArray(found.sources) ? found.sources : [] });
            setProfiles(prof.profiles.filter((p) => p.isClinician));
            setDirty(false);
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }, [termRef]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const set = <K extends keyof Term>(k: K, v: Term[K]) => {
        setT((x) => (x ? { ...x, [k]: v } : x));
        setDirty(true);
    };

    async function save(): Promise<string | null> {
        if (!t) return null;
        const res = await api<{ slug: string }>(`/glossary/${t.id}`, {
            method: "PUT",
            json: { slug: t.status === "published" ? t.slug : "", term: t.term, altNames: t.altNames, shortDefinition: t.shortDefinition, body: body.current, sources: t.sources ?? [], reviewedByProfileId: t.reviewedByProfileId },
        });
        setDirty(false);
        if (res.slug !== t.slug) {
            setT({ ...t, slug: res.slug });
            router.replace(`/glossario/${res.slug}`);
        }
        return res.slug;
    }

    async function run(fn: () => Promise<void>, ok?: string) {
        setBusy(true);
        try {
            await fn();
            if (ok) toast.success(ok);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setBusy(false);
        }
    }

    if (!t) return <p className="my-20 text-center text-slate-500">Carregando editor…</p>;
    const published = t.status === "published";
    return (
        <div>
            <div className="sticky z-[56] mb-8 flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-white/95 px-3 py-2 text-sm shadow-sm backdrop-blur" style={{ top: "calc(var(--admin-bar-h, 0px) + 4.25rem)" }}>
                <span className="mr-auto text-slate-600">{published ? "Publicado" : "Rascunho"}{dirty ? " · alterações não salvas" : ""}</span>
                <label className="flex items-center gap-1 text-slate-600">Revisão:
                    <select className="rounded border bg-white px-2 py-1" value={t.reviewedByProfileId ?? ""} onChange={(e) => set("reviewedByProfileId", e.target.value || null)}>
                        <option value="">escolher psicólogo(a)</option>
                        {profiles.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                    </select>
                </label>
                {published && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => { await api(`/glossary/${t.id}/unpublish`, { method: "POST" }); await load(); router.refresh(); }, "Termo despublicado")}>Despublicar</Button>}
                <Button size="sm" variant="outline" disabled={busy || !dirty} onClick={() => run(async () => void (await save()), "Rascunho salvo")}>Salvar</Button>
                <Button size="sm" disabled={busy} onClick={() => run(async () => {
                    await save();
                    await api(`/glossary/${t.id}/publish`, { method: "POST" });
                    await load();
                    router.refresh();
                }, "Publicado")}>{published ? "Publicar alterações" : "Publicar"}</Button>
                <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => run(async () => {
                    if (!confirm("Excluir este termo definitivamente?")) return;
                    await api(`/glossary/${t.id}`, { method: "DELETE" });
                    window.location.href = "/glossario";
                })}>Excluir</Button>
            </div>
            <InlineText as="h1" value={t.term} onChange={(v) => set("term", v)} placeholder="Termo" className="mb-4 text-4xl font-bold text-slate-900" />
            <p className="mb-4 text-sm text-slate-500">Também chamado de:{" "}
                <input className="edit-box w-2/3 bg-transparent px-1" value={t.altNames.join(", ")} onChange={(e) => set("altNames", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} placeholder="outros nomes, separados por vírgula" />
            </p>
            <InlineText as="p" value={t.shortDefinition} onChange={(v) => set("shortDefinition", v)} placeholder="Definição curta (1 ou 2 frases)" className="mb-8 text-xl leading-relaxed text-slate-600" />
            <div className="prose prose-lg prose-slate max-w-none">
                <RichTextEditor inline value={body.current} media={[]} onPickImage={pick} onChange={(d) => { body.current = d; setDirty(true); }} />
            </div>
            {picker}
            <section className="mt-10 border-t pt-6">
                <h2 className="mb-2 text-lg font-semibold text-slate-900">Referências</h2>
                <Textarea rows={4} className="edit-box" value={(t.sources ?? []).join("\n")} placeholder="Uma referência por linha (autor, título, ano, link)" onChange={(e) => set("sources", e.target.value.split("\n").filter((l) => l.trim()))} />
            </section>
        </div>
    );
}
