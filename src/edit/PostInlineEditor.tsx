"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor, type LexicalDoc } from "@/editor/RichTextEditor";
import type { MediaRef } from "@/editor/UploadNode";
import { ApiError, api, errorMessage } from "@/admin/lib/adminFetch";
import { useMediaPicker } from "@/admin/components/MediaPicker";
import { slugify } from "@/admin/lib/slugify";

type Post = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    keywords: string;
    content: LexicalDoc | null;
    status: "draft" | "in_review" | "scheduled" | "published" | "archived";
    publishedAt?: string | null;
    authorName: string;
    imageId?: string | null;
    metaTitle: string;
    metaDescription: string;
    version: number;
    hasUnpublishedChanges: boolean;
    updatedAt: string;
};
type Flag = { rule: string; match: string; message: string };
type MediaItem = MediaRef & { filename: string };

/** Single-line contentEditable that looks exactly like the final heading/paragraph. */
function InlineText({ as: Tag, value, onChange, className, placeholder }: { as: "h1" | "p"; value: string; onChange: (v: string) => void; className: string; placeholder: string }) {
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.textContent = value;
        // set once: later typing must not be overwritten by React
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <Tag
            // @ts-expect-error ref typing for dynamic tag
            ref={ref}
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            data-placeholder={placeholder}
            className={`${className} edit-box`}
            onInput={(e: React.FormEvent<HTMLElement>) => onChange((e.currentTarget.textContent ?? "").replace(/\s*\n\s*/g, " "))}
            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && e.preventDefault()}
            onPaste={(e: React.ClipboardEvent) => {
                e.preventDefault();
                document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " "));
            }}
        />
    );
}

/**
 * The post page itself, editable: same markup as /blog/<slug>, but title, resumo, capa and texto are
 * edited in place. Rendered by the post page when an admin is editing, and for drafts (which have no public page).
 */
export function PostInlineEditor({ postRef }: { postRef: string }) {
    const router = useRouter();
    const [post, setPost] = useState<Post | null>(null);
    const [form, setForm] = useState<Omit<Post, "content"> | null>(null);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const content = useRef<LexicalDoc | null>(null);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flags, setFlags] = useState<Flag[] | null>(null);
    const [publishOpen, setPublishOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [ack, setAck] = useState(false);
    const slugTouched = useRef(false);
    const [picker, pick] = useMediaPicker(media);

    const load = useCallback(async () => {
        try {
            const [p, m] = await Promise.all([api<Post>(`/posts/${postRef}`), api<{ media: MediaItem[] }>("/media")]);
            setMedia(m.media);
            setPost(p);
            const { content: c, ...rest } = p;
            content.current = c;
            setForm(rest);
            setDirty(false);
        } catch (e) {
            setError(errorMessage(e));
        }
    }, [postRef]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const cover = useMemo(() => media.find((m) => m.id === form?.imageId), [media, form?.imageId]);

    const set = useCallback(<K extends keyof Omit<Post, "content">>(k: K, v: Omit<Post, "content">[K]) => {
        setForm((f) => (f ? { ...f, [k]: v } : f));
        setDirty(true);
    }, []);

    async function save(silent = false): Promise<boolean> {
        if (!form) return false;
        // A draft's address follows its title until the editor sets one by hand.
        const slug = form.status !== "published" && !slugTouched.current ? slugify(form.title) || form.slug : form.slug;
        try {
            const res = await api<{ version: number }>(`/posts/${form.id}`, {
                method: "PATCH",
                headers: { "If-Match": String(form.version) },
                json: {
                    title: form.title,
                    slug,
                    excerpt: form.excerpt,
                    keywords: form.keywords,
                    authorName: form.authorName,
                    imageId: form.imageId ?? "",
                    metaTitle: form.metaTitle,
                    metaDescription: form.metaDescription,
                    content: content.current,
                },
            });
            setForm((f) => (f ? { ...f, version: res.version, slug } : f));
            setDirty(false);
            if (!silent) toast.success("Rascunho salvo");
            if (slug !== form.slug) router.replace(`/blog/${slug}`);
            return true;
        } catch (e) {
            toast.error(e instanceof ApiError && e.status === 412 ? "Este post foi alterado em outra aba. Recarregue a página para não perder nada." : errorMessage(e));
            return false;
        }
    }

    async function run(fn: () => Promise<void>) {
        setBusy(true);
        try {
            await fn();
        } finally {
            setBusy(false);
        }
    }

    // Ctrl/Cmd+S saves the draft.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (dirty && !busy) void run(async () => void (await save()));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    if (error) return <p className="my-20 text-center text-red-700">{error}</p>;
    if (!post || !form) return <p className="my-20 text-center text-slate-500">Carregando editor…</p>;

    const published = form.status === "published";
    const check = () =>
        run(async () => {
            if (!(await save(true))) return;
            const r = await api<{ flags: Flag[] }>(`/posts/${form.id}/lint`, { method: "POST" });
            setFlags(r.flags);
            if (r.flags.length === 0) toast.success("Nenhum problema encontrado nas regras do CFP.");
        });

    const publish = (acknowledge: boolean) =>
        run(async () => {
            if (!(await save(true))) return;
            try {
                await api(`/posts/${form.id}/publish`, { method: "POST", json: { acknowledgeLint: acknowledge } });
                toast.success("Publicado");
                setPublishOpen(false);
                setAck(false);
                setFlags(null);
                await load();
                router.refresh();
            } catch (e) {
                if (e instanceof ApiError && e.status === 422 && (e.body as { flags?: Flag[] })?.flags) {
                    setFlags((e.body as { flags: Flag[] }).flags);
                    setPublishOpen(true);
                } else toast.error(errorMessage(e));
            }
        });

    const unpublish = () =>
        run(async () => {
            if (!confirm("Tirar este post do ar? Ele volta a ser rascunho.")) return;
            try {
                await api(`/posts/${form.id}/unpublish`, { method: "POST" });
                toast.success("Post despublicado");
                await load();
                router.refresh();
            } catch (e) {
                toast.error(errorMessage(e));
            }
        });

    const remove = () =>
        run(async () => {
            if (!confirm("Excluir este post definitivamente? Os comentários dele também serão apagados.")) return;
            try {
                await api(`/posts/${form.id}`, { method: "DELETE" });
                setDirty(false);
                window.location.href = "/blog";
            } catch (e) {
                toast.error(errorMessage(e));
            }
        });

    return (
        <>
            <div
                className="sticky z-[56] -mx-4 mb-8 flex flex-wrap items-center justify-end gap-2 rounded-lg border bg-white/95 px-3 py-2 shadow-sm backdrop-blur"
                style={{ top: "calc(var(--admin-bar-h, 0px) + 4.25rem)" }}
                role="toolbar"
                aria-label="Ações do post"
            >
                <span className="mr-auto text-sm text-slate-600">
                    {published ? "Publicado" : "Rascunho"}
                    {dirty ? " · alterações não salvas" : published && form.hasUnpublishedChanges ? " · alterações não publicadas" : ""}
                </span>
                <Button size="sm" variant="outline" onClick={() => setDetailsOpen(true)}>Detalhes</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={check}>Verificar texto</Button>
                <Button size="sm" variant="outline" disabled={busy || !dirty} onClick={() => run(async () => void (await save()))}>Salvar rascunho</Button>
                <Button size="sm" disabled={busy} onClick={() => publish(false)}>{published ? "Publicar alterações" : "Publicar"}</Button>
            </div>

            {flags && flags.length > 0 && !publishOpen && (
                <div role="alert" className="mb-6 rounded-md border border-amber-500/50 bg-amber-50 p-4 text-left text-sm">
                    <p className="mb-2 font-medium">Atenção às regras do CFP (Res. 010/2005):</p>
                    <ul className="list-disc space-y-1 pl-5">
                        {flags.map((f, i) => (
                            <li key={i}><strong>“{f.match}”</strong> — {f.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            <header className="mb-12 text-center">
                <div className="mb-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                    <time>{published && form.publishedAt ? new Date(form.publishedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "Rascunho"}</time>
                    <span aria-hidden="true">•</span>
                    <span>Por {form.authorName || "João Vitor Fernandes"}</span>
                </div>
                <InlineText as="h1" value={form.title} onChange={(v) => set("title", v)} placeholder="Título do post" className="mb-8 text-4xl font-bold leading-tight text-slate-900 md:text-5xl" />
                <InlineText as="p" value={form.excerpt} onChange={(v) => set("excerpt", v)} placeholder="Resumo: aparece na lista de posts e no Google" className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-600" />
            </header>

            <div className="mb-12">
                {cover ? (
                    <div className="group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover.url} alt={cover.alt ?? ""} className="h-auto w-full rounded-xl object-cover" />
                        <div className="absolute right-3 top-3 hidden gap-2 group-hover:flex">
                            <Button size="sm" onClick={async () => { const m = await pick(); if (m) set("imageId", m); }}>Trocar capa</Button>
                            <Button size="sm" variant="secondary" onClick={() => set("imageId", "")}>Remover</Button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={async () => { const m = await pick(); if (m) set("imageId", m); }}
                        className="edit-box flex w-full items-center justify-center gap-2 rounded-xl py-10 text-slate-500 hover:text-slate-700"
                    >
                        <ImageIcon className="h-5 w-5" /> Adicionar imagem de capa
                    </button>
                )}
            </div>

            <div className="prose prose-lg prose-slate mx-auto prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl">
                <RichTextEditor
                    inline
                    key={`${post.id}-${post.version}-${post.updatedAt}`}
                    value={content.current}
                    media={media}
                    onChange={(doc) => {
                        content.current = doc;
                        setDirty(true);
                    }}
                    onPickImage={pick}
                />
            </div>
            {picker}

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes do post</DialogTitle>
                        <DialogDescription>Endereço, autor e informações para buscadores.</DialogDescription>
                    </DialogHeader>
                    <label className="grid gap-1 text-sm">
                        Endereço (URL)
                        <Input
                            value={form.slug}
                            disabled={published}
                            onChange={(e) => { slugTouched.current = true; set("slug", slugify(e.target.value)); }}
                        />
                        <span className="text-xs text-muted-foreground">/blog/{form.slug}{published ? " (post publicado: o endereço não muda)" : ""}</span>
                    </label>
                    <label className="grid gap-1 text-sm">
                        Autor
                        <Input value={form.authorName} onChange={(e) => set("authorName", e.target.value)} />
                    </label>
                    <label className="grid gap-1 text-sm">
                        Título para o Google (opcional)
                        <Input value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
                    </label>
                    <label className="grid gap-1 text-sm">
                        Descrição para o Google (opcional)
                        <Textarea value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} rows={3} />
                    </label>
                    <label className="grid gap-1 text-sm">
                        Palavras-chave
                        <Textarea value={form.keywords} onChange={(e) => set("keywords", e.target.value)} rows={2} />
                    </label>
                    <DialogFooter className="gap-2 sm:justify-between">
                        <div className="flex gap-2">
                            {published && <Button variant="outline" disabled={busy} onClick={unpublish}>Despublicar</Button>}
                            <Button variant="ghost" className="text-destructive" disabled={busy} onClick={remove}>Excluir</Button>
                        </div>
                        <Button onClick={() => setDetailsOpen(false)}>Concluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={publishOpen} onOpenChange={(o) => !busy && setPublishOpen(o)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revise antes de publicar</DialogTitle>
                        <DialogDescription>O texto contém trechos que podem ferir a Resolução CFP 010/2005 (publicidade).</DialogDescription>
                    </DialogHeader>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                        {(flags ?? []).map((f, i) => (
                            <li key={i}><strong>“{f.match}”</strong> — {f.message}</li>
                        ))}
                    </ul>
                    <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                        Revisei os pontos acima e quero publicar mesmo assim.
                    </label>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPublishOpen(false)} disabled={busy}>Voltar e editar</Button>
                        <Button disabled={!ack || busy} onClick={() => publish(true)}>Publicar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
