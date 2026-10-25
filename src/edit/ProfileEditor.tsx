"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor, type LexicalDoc } from "@/editor/RichTextEditor";
import type { MediaRef } from "@/editor/UploadNode";
import { api, errorMessage } from "@/admin/lib/adminFetch";
import { useMediaPicker } from "@/admin/components/MediaPicker";
import { InlineText } from "./InlineText";

type Entry = { id: string; title: string; organization: string; location: string; startDate: string | null; endDate: string | null; isCurrent: boolean; description: string; url: string; featured: boolean };
type Section = { id: string; kind: string; title: string; visible: boolean; entries: Entry[] };
type Profile = {
    id: string; slug: string; displayName: string; fullName: string; jobTitle: string; approach: string; visibility: "public" | "hidden";
    crp: string | null; isClinician: boolean; isPrimary: boolean; practicingSince: number | null; bio: LexicalDoc | null; photoId: string | null;
    knowsAbout: string[]; languages: string[]; alumniOf: string[]; links: Record<string, string>;
};
type MediaItem = MediaRef & { filename: string };

const KINDS: [string, string][] = [["experience", "Experiência"], ["education", "Formação"], ["certification", "Certificações"], ["course", "Cursos"], ["publication", "Publicações"], ["language", "Idiomas"], ["award", "Prêmios"], ["custom", "Outra"]];
const EMPTY_ENTRY: Omit<Entry, "id"> = { title: "", organization: "", location: "", startDate: null, endDate: null, isCurrent: false, description: "", url: "", featured: false };

/** A team profile, edited on its own page: header, about, sections and entries (LinkedIn-style). */
export function ProfileEditor({ profileRef }: { profileRef: string }) {
    const router = useRouter();
    const [p, setP] = useState<Profile | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [role, setRole] = useState("tech");
    const bio = useRef<LexicalDoc | null>(null);
    const titles = useRef<Record<string, string>>({});
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [entryDlg, setEntryDlg] = useState<{ sectionId: string; id?: string; v: Omit<Entry, "id"> } | null>(null);
    const [sectionDlg, setSectionDlg] = useState<{ kind: string; title: string } | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [picker, pick] = useMediaPicker(media);

    const load = useCallback(async () => {
        try {
            const [d, m, me] = await Promise.all([
                api<{ profile: Profile; sections: Section[] }>(`/profiles/${profileRef}`),
                api<{ media: MediaItem[] }>("/media"),
                api<{ role: string }>("/me"),
            ]);
            bio.current = d.profile.bio;
            titles.current = {};
            setP({ ...d.profile, links: d.profile.links ?? {} });
            setSections(d.sections);
            setMedia(m.media);
            setRole(me.role);
            setDirty(false);
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }, [profileRef]);

    // Entry and section changes are saved at once; reloading only the sections keeps unsaved header edits.
    const reloadSections = useCallback(async () => {
        const d = await api<{ sections: Section[] }>(`/profiles/${profileRef}`);
        setSections(d.sections);
    }, [profileRef]);

    useEffect(() => {
        void load();
    }, [load]);

    const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
        setP((x) => (x ? { ...x, [k]: v } : x));
        setDirty(true);
    };

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

    const clinical = role === "clinical";
    const save = () => run(async () => {
        if (!p) return;
        const json: Record<string, unknown> = {
            displayName: p.displayName, jobTitle: p.jobTitle, approach: p.approach, bio: bio.current, photoId: p.photoId ?? "",
            knowsAbout: p.knowsAbout, languages: p.languages, alumniOf: p.alumniOf, links: p.links, practicingSince: p.practicingSince ?? undefined,
        };
        if (clinical) Object.assign(json, { crp: p.crp ?? "", visibility: p.visibility, isClinician: p.isClinician, slug: p.slug });
        await api(`/profiles/${p.id}`, { method: "PATCH", json });
        for (const [id, title] of Object.entries(titles.current)) await api(`/sections/${id}`, { method: "PATCH", json: { title } });
        setDirty(false);
        await load();
        router.refresh();
        if (clinical && p.slug !== profileRef.replace("slug:", "")) router.replace(`/sobre/${p.slug}`);
    }, "Perfil salvo");

    const move = (list: { id: string }[], i: number, dir: -1 | 1, url: string) => run(async () => {
        const ids = list.map((x) => x.id);
        [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
        await api(url, { method: "POST", json: { ids } });
        await reloadSections();
        router.refresh();
    });

    if (!p) return <p className="my-20 text-center text-slate-500">Carregando editor…</p>;
    const photo = media.find((m) => m.id === p.photoId);
    const field = (k: string, v: string | null) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEntryDlg((d) => d && { ...d, v: { ...d.v, [k]: e.target.value || (v === null ? null : "") } });

    return (
        <div>
            <div className="sticky z-[56] mb-8 flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-white/95 px-3 py-2 text-sm shadow-sm backdrop-blur" style={{ top: "calc(var(--admin-bar-h, 0px) + 4.25rem)" }}>
                <span className="mr-auto text-slate-600">{p.visibility === "public" ? "Perfil público" : "Perfil oculto (só você vê)"}{dirty ? " · alterações não salvas" : ""}</span>
                <Button size="sm" variant="outline" onClick={() => setDetailsOpen(true)}>Detalhes</Button>
                <Button size="sm" disabled={busy || !dirty} onClick={save}>Salvar perfil</Button>
            </div>

            <header className="mb-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
                <button type="button" className="edit-box h-40 w-40 shrink-0 overflow-hidden rounded-full" onClick={async () => { const m = await pick(); if (m) set("photoId", m); }} aria-label="Trocar foto">
                    {photo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={photo.url} alt={photo.alt ?? ""} className="h-full w-full object-cover" /> : <span className="text-sm text-slate-500">Adicionar foto</span>}
                </button>
                <div className="min-w-0 flex-1">
                    <InlineText as="h1" value={p.displayName} onChange={(v) => set("displayName", v)} placeholder="Nome" className="text-4xl font-bold text-slate-900" />
                    <InlineText as="p" value={p.jobTitle} onChange={(v) => set("jobTitle", v)} placeholder="Cargo ou função" className="mt-1 text-xl text-slate-600" />
                    <InlineText as="p" value={p.approach} onChange={(v) => set("approach", v)} placeholder="Abordagem ou especialidade" className="mt-1 text-slate-500" />
                    {p.isClinician && p.crp && <p className="mt-1 text-sm text-slate-500">CRP {p.crp}</p>}
                </div>
            </header>

            <section className="mb-10">
                <h2 className="mb-3 text-2xl font-semibold text-slate-900">Sobre</h2>
                <div className="prose prose-lg prose-slate max-w-none">
                    <RichTextEditor inline value={bio.current} media={media} onPickImage={pick} onChange={(d) => { bio.current = d; setDirty(true); }} />
                </div>
            </section>

            {sections.map((s, si) => (
                <section key={s.id} className={`mb-10 ${s.visible ? "" : "opacity-60"}`}>
                    <div className="mb-4 flex items-center gap-2">
                        <InlineText as="h2" value={s.title} onChange={(v) => { titles.current[s.id] = v; setDirty(true); }} placeholder="Título da seção" className="flex-1 text-2xl font-semibold text-slate-900" />
                        <Button size="icon" variant="ghost" disabled={si === 0 || busy} aria-label="Subir seção" onClick={() => move(sections, si, -1, `/profiles/${p.id}/sections/reorder`)}><ArrowUp /></Button>
                        <Button size="icon" variant="ghost" disabled={si === sections.length - 1 || busy} aria-label="Descer seção" onClick={() => move(sections, si, 1, `/profiles/${p.id}/sections/reorder`)}><ArrowDown /></Button>
                        <Button size="icon" variant="ghost" aria-label={s.visible ? "Ocultar seção" : "Mostrar seção"} onClick={() => run(async () => { await api(`/sections/${s.id}`, { method: "PATCH", json: { visible: !s.visible } }); await reloadSections(); router.refresh(); })}>{s.visible ? <Eye /> : <EyeOff />}</Button>
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label="Remover seção" onClick={() => run(async () => { if (!confirm(`Remover a seção “${s.title}” e todos os itens dela?`)) return; await api(`/sections/${s.id}`, { method: "DELETE" }); await reloadSections(); router.refresh(); })}><Trash2 /></Button>
                    </div>
                    <ul className="space-y-3">
                        {s.entries.map((e, ei) => (
                            <li key={e.id} className="edit-box flex items-start gap-2 rounded-md border-l-2 border-green-700/30 py-1 pl-4">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900">{e.title}{e.featured && <span className="ml-2 rounded bg-green-100 px-1.5 text-xs font-normal text-green-800">na home</span>}</p>
                                    <p className="text-slate-600">{[e.organization, e.location].filter(Boolean).join(" · ")}</p>
                                    {e.description && <p className="text-sm text-slate-500">{e.description}</p>}
                                </div>
                                <Button size="icon" variant="ghost" disabled={ei === 0 || busy} aria-label="Subir item" onClick={() => move(s.entries, ei, -1, `/sections/${s.id}/entries/reorder`)}><ArrowUp /></Button>
                                <Button size="icon" variant="ghost" disabled={ei === s.entries.length - 1 || busy} aria-label="Descer item" onClick={() => move(s.entries, ei, 1, `/sections/${s.id}/entries/reorder`)}><ArrowDown /></Button>
                                <Button size="icon" variant="ghost" aria-label="Editar item" onClick={() => setEntryDlg({ sectionId: s.id, id: e.id, v: { ...e } })}><Pencil /></Button>
                                <Button size="icon" variant="ghost" className="text-destructive" aria-label="Remover item" onClick={() => run(async () => { if (!confirm("Remover este item?")) return; await api(`/entries/${e.id}`, { method: "DELETE" }); await reloadSections(); router.refresh(); })}><Trash2 /></Button>
                            </li>
                        ))}
                    </ul>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setEntryDlg({ sectionId: s.id, v: { ...EMPTY_ENTRY } })}><Plus /> Adicionar item</Button>
                </section>
            ))}
            <Button variant="outline" onClick={() => setSectionDlg({ kind: "experience", title: "" })}><Plus /> Nova seção</Button>
            {picker}

            <Dialog open={!!entryDlg} onOpenChange={(o) => !busy && !o && setEntryDlg(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{entryDlg?.id ? "Editar item" : "Novo item"}</DialogTitle><DialogDescription>Aparece no perfil público e, se marcado, na home.</DialogDescription></DialogHeader>
                    {entryDlg && (
                        <>
                            <label className="grid gap-1 text-sm font-medium">Título<Input value={entryDlg.v.title} onChange={field("title", "")} /></label>
                            <label className="grid gap-1 text-sm font-medium">Instituição ou empresa<Input value={entryDlg.v.organization} onChange={field("organization", "")} /></label>
                            <label className="grid gap-1 text-sm font-medium">Local<Input value={entryDlg.v.location} onChange={field("location", "")} /></label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="grid gap-1 text-sm font-medium">Início<Input type="date" value={entryDlg.v.startDate ?? ""} onChange={field("startDate", null)} /></label>
                                <label className="grid gap-1 text-sm font-medium">Fim<Input type="date" value={entryDlg.v.endDate ?? ""} disabled={entryDlg.v.isCurrent} onChange={field("endDate", null)} /></label>
                            </div>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={entryDlg.v.isCurrent} onChange={(e) => setEntryDlg({ ...entryDlg, v: { ...entryDlg.v, isCurrent: e.target.checked } })} /> Em andamento</label>
                            <label className="grid gap-1 text-sm font-medium">Descrição<Textarea rows={3} value={entryDlg.v.description} onChange={field("description", "")} /></label>
                            <label className="grid gap-1 text-sm font-medium">Link (opcional)<Input value={entryDlg.v.url} onChange={field("url", "")} placeholder="https://" /></label>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={entryDlg.v.featured} onChange={(e) => setEntryDlg({ ...entryDlg, v: { ...entryDlg.v, featured: e.target.checked } })} /> Destacar na home (Formações e qualificações)</label>
                        </>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEntryDlg(null)} disabled={busy}>Cancelar</Button>
                        <Button disabled={busy || !entryDlg?.v.title.trim()} onClick={() => run(async () => {
                            if (!entryDlg) return;
                            const v = { ...entryDlg.v, startDate: entryDlg.v.startDate ?? "", endDate: entryDlg.v.isCurrent ? "" : entryDlg.v.endDate ?? "" };
                            if (entryDlg.id) await api(`/entries/${entryDlg.id}`, { method: "PATCH", json: v });
                            else await api(`/sections/${entryDlg.sectionId}/entries`, { method: "POST", json: v });
                            setEntryDlg(null);
                            await reloadSections();
                            router.refresh();
                        })}>Salvar item</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!sectionDlg} onOpenChange={(o) => !busy && !o && setSectionDlg(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nova seção</DialogTitle><DialogDescription>Ex.: Experiência, Cursos, Publicações.</DialogDescription></DialogHeader>
                    {sectionDlg && (
                        <>
                            <label className="grid gap-1 text-sm font-medium">Tipo
                                <select className="rounded-md border bg-white px-3 py-2 text-sm font-normal" value={sectionDlg.kind} onChange={(e) => setSectionDlg({ ...sectionDlg, kind: e.target.value, title: sectionDlg.title || KINDS.find(([k]) => k === e.target.value)?.[1] || "" })}>
                                    {KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-1 text-sm font-medium">Título<Input value={sectionDlg.title} onChange={(e) => setSectionDlg({ ...sectionDlg, title: e.target.value })} /></label>
                        </>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSectionDlg(null)}>Cancelar</Button>
                        <Button disabled={busy || !sectionDlg?.title.trim()} onClick={() => run(async () => { await api(`/profiles/${p.id}/sections`, { method: "POST", json: sectionDlg }); setSectionDlg(null); await reloadSections(); router.refresh(); })}>Criar seção</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Detalhes do perfil</DialogTitle><DialogDescription>Dados para buscadores e links. Registro profissional e visibilidade são definidos pelo psicólogo responsável.</DialogDescription></DialogHeader>
                    <label className="grid gap-1 text-sm font-medium">Em atuação desde (ano)<Input type="number" value={p.practicingSince ?? ""} onChange={(e) => set("practicingSince", e.target.value ? Number(e.target.value) : null)} /></label>
                    <label className="grid gap-1 text-sm font-medium">Temas e especialidades (separados por vírgula)<Textarea rows={2} value={p.knowsAbout.join(", ")} onChange={(e) => set("knowsAbout", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></label>
                    <label className="grid gap-1 text-sm font-medium">Idiomas (separados por vírgula)<Input value={p.languages.join(", ")} onChange={(e) => set("languages", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></label>
                    <label className="grid gap-1 text-sm font-medium">Instituições de formação (uma por linha)<Textarea rows={3} value={p.alumniOf.join("\n")} onChange={(e) => set("alumniOf", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} /></label>
                    {(["instagram", "linkedin", "lattes", "site"] as const).map((k) => (
                        <label key={k} className="grid gap-1 text-sm font-medium capitalize">{k === "site" ? "Site" : k}<Input value={p.links[k] ?? ""} placeholder="https://" onChange={(e) => set("links", { ...p.links, [k]: e.target.value })} /></label>
                    ))}
                    {clinical && (
                        <>
                            <label className="grid gap-1 text-sm font-medium">Endereço do perfil<Input value={p.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} /></label>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.isClinician} onChange={(e) => set("isClinician", e.target.checked)} /> Psicólogo(a) com registro profissional</label>
                            {p.isClinician && <label className="grid gap-1 text-sm font-medium">CRP<Input value={p.crp ?? ""} onChange={(e) => set("crp", e.target.value)} placeholder="06/000000" /></label>}
                            <label className="grid gap-1 text-sm font-medium">Visibilidade
                                <select className="rounded-md border bg-white px-3 py-2 text-sm font-normal" value={p.visibility} onChange={(e) => set("visibility", e.target.value as Profile["visibility"])}>
                                    <option value="public">Público (aparece no site)</option><option value="hidden">Oculto</option>
                                </select>
                            </label>
                        </>
                    )}
                    <DialogFooter><Button onClick={() => setDetailsOpen(false)}>Concluir</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
