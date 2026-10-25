'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RichTextEditor, type LexicalDoc } from '@/editor/RichTextEditor'
import type { MediaRef } from '@/editor/UploadNode'
import { ApiError, api, errorMessage } from '../lib/adminFetch'
import { LoadState, PageHeader, fmtDate } from '../components/ui'
import { useMediaPicker } from '../components/MediaPicker'
import { slugify } from './Posts'

type Post = {
    id: string
    slug: string
    title: string
    excerpt: string
    keywords: string
    content: LexicalDoc | null
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived'
    publishedAt?: string | null
    authorName: string
    imageId?: string | null
    metaTitle: string
    metaDescription: string
    origin: string
    version: number
    hasUnpublishedChanges: boolean
    updatedAt: string
}
type Flag = { rule: string; match: string; message: string }
type MediaItem = MediaRef & { filename: string }

export function PostEditor({ id }: { id: string }) {
    const router = useRouter()
    const [post, setPost] = useState<Post | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [media, setMedia] = useState<MediaItem[]>([])
    const [form, setForm] = useState<Omit<Post, 'content'> | null>(null)
    const content = useRef<LexicalDoc | null>(null)
    const [dirty, setDirty] = useState(false)
    const [busy, setBusy] = useState(false)
    const [flags, setFlags] = useState<Flag[] | null>(null)
    const [publishOpen, setPublishOpen] = useState(false)
    const [ack, setAck] = useState(false)
    const [picker, pick] = useMediaPicker(media)

    const load = useCallback(async () => {
        try {
            const [p, m] = await Promise.all([api<Post>(`/posts/${id}`), api<{ media: MediaItem[] }>('/media')])
            setMedia(m.media)
            setPost(p)
            const { content: c, ...rest } = p
            content.current = c
            setForm(rest)
            setDirty(false)
        } catch (e) {
            setError(errorMessage(e))
        }
    }, [id])

    useEffect(() => {
        void load()
    }, [load])

    useEffect(() => {
        if (!dirty) return
        const warn = (e: BeforeUnloadEvent) => e.preventDefault()
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [dirty])

    const cover = useMemo(() => media.find((m) => m.id === form?.imageId), [media, form?.imageId])

    if (error) return <LoadState loading={false} error={error} />
    if (!post || !form) return <LoadState loading error={null} />

    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
        setForm({ ...form, [k]: v })
        setDirty(true)
    }

    async function save(silent = false): Promise<boolean> {
        if (!form) return false
        try {
            const res = await api<{ version: number }>(`/posts/${id}`, {
                method: 'PATCH',
                headers: { 'If-Match': String(form.version) },
                json: {
                    title: form.title,
                    slug: form.slug,
                    excerpt: form.excerpt,
                    keywords: form.keywords,
                    authorName: form.authorName,
                    imageId: form.imageId ?? '',
                    metaTitle: form.metaTitle,
                    metaDescription: form.metaDescription,
                    content: content.current,
                },
            })
            setForm((f) => (f ? { ...f, version: res.version } : f))
            setDirty(false)
            if (!silent) toast.success('Rascunho salvo')
            return true
        } catch (e) {
            if (e instanceof ApiError && e.status === 412) {
                toast.error('Este post foi alterado em outra aba ou por outra pessoa. Recarregue a página para não perder nada.')
            } else {
                toast.error(errorMessage(e))
            }
            return false
        }
    }

    async function run(fn: () => Promise<void>) {
        setBusy(true)
        try {
            await fn()
        } finally {
            setBusy(false)
        }
    }

    const check = () =>
        run(async () => {
            if (!(await save(true))) return
            const r = await api<{ flags: Flag[] }>(`/posts/${id}/lint`, { method: 'POST' })
            setFlags(r.flags)
            if (r.flags.length === 0) toast.success('Nenhum problema encontrado nas regras do CFP.')
        })

    const publish = (acknowledge: boolean) =>
        run(async () => {
            if (!(await save(true))) return
            try {
                await api(`/posts/${id}/publish`, { method: 'POST', json: { acknowledgeLint: acknowledge } })
                toast.success('Publicado')
                setPublishOpen(false)
                setAck(false)
                await load()
            } catch (e) {
                if (e instanceof ApiError && e.status === 422 && (e.body as { flags?: Flag[] })?.flags) {
                    setFlags((e.body as { flags: Flag[] }).flags)
                    setPublishOpen(true)
                } else {
                    toast.error(errorMessage(e))
                }
            }
        })

    const unpublish = () =>
        run(async () => {
            if (!confirm('Tirar este post do ar? Ele volta a ser rascunho.')) return
            try {
                await api(`/posts/${id}/unpublish`, { method: 'POST' })
                toast.success('Post despublicado')
                await load()
            } catch (e) {
                toast.error(errorMessage(e))
            }
        })

    const remove = () =>
        run(async () => {
            if (!confirm('Excluir este post definitivamente? Os comentários dele também serão apagados.')) return
            try {
                await api(`/posts/${id}`, { method: 'DELETE' })
                router.push('/admin/posts')
            } catch (e) {
                toast.error(errorMessage(e))
            }
        })

    const published = form.status === 'published'

    return (
        <>
            <div className="mb-2">
                <Link href="/admin/posts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Posts
                </Link>
            </div>
            <PageHeader
                title={form.title || 'Sem título'}
                description={`${published ? 'Publicado' : 'Rascunho'}${form.publishedAt ? ` em ${fmtDate(form.publishedAt)}` : ''} · versão ${form.version}`}
                actions={
                    <>
                        {dirty && <Badge variant="secondary">Alterações não salvas</Badge>}
                        {published && form.hasUnpublishedChanges && !dirty && <Badge variant="secondary">Alterações não publicadas</Badge>}
                        <Button variant="outline" disabled={busy || !dirty} onClick={() => run(async () => void (await save()))}>Salvar rascunho</Button>
                        <Button variant="outline" disabled={busy} onClick={check}>Verificar texto</Button>
                        <Button disabled={busy} onClick={() => publish(false)}>{published ? 'Publicar alterações' : 'Publicar'}</Button>
                    </>
                }
            />

            {flags && flags.length > 0 && !publishOpen && (
                <div role="alert" className="mb-4 rounded-md border border-amber-500/50 bg-amber-50 p-4 text-sm">
                    <p className="mb-2 font-medium">Atenção às regras do CFP (Res. 010/2005):</p>
                    <ul className="list-disc space-y-1 pl-5">
                        {flags.map((f, i) => <li key={i}><strong>“{f.match}”</strong> — {f.message}</li>)}
                    </ul>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                <div className="min-w-0 space-y-4">
                    <label className="grid gap-1 text-sm font-medium">
                        Título
                        <Input value={form.title} onChange={(e) => set('title', e.target.value)} className="text-lg" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Resumo (aparece na lista e nos buscadores)
                        <Textarea value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} rows={3} />
                    </label>
                    <div>
                        <p className="mb-1 text-sm font-medium">Texto</p>
                        <RichTextEditor
                            key={`${post.id}-${post.version}-${post.updatedAt}`}
                            value={content.current}
                            media={media}
                            onChange={(doc) => { content.current = doc; setDirty(true) }}
                            onPickImage={pick}
                        />
                    </div>
                </div>

                <aside className="space-y-4">
                    <section className="rounded-lg border bg-card p-4">
                        <h2 className="mb-3 text-sm font-semibold">Imagem de capa</h2>
                        {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover.url} alt={cover.alt ?? ''} className="mb-2 aspect-video w-full rounded object-cover" />
                        ) : (
                            <p className="mb-2 text-sm text-muted-foreground">Sem imagem.</p>
                        )}
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={async () => { const m = await pick(); if (m) set('imageId', m) }}><ImageIcon /> Escolher</Button>
                            {cover && <Button size="sm" variant="ghost" onClick={() => set('imageId', '')}>Remover</Button>}
                        </div>
                    </section>

                    <section className="space-y-3 rounded-lg border bg-card p-4">
                        <h2 className="text-sm font-semibold">Publicação</h2>
                        <label className="grid gap-1 text-sm">
                            Endereço (URL)
                            <Input value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} />
                            <span className="text-xs text-muted-foreground">/blog/{form.slug}</span>
                        </label>
                        <label className="grid gap-1 text-sm">
                            Autor
                            <Input value={form.authorName} onChange={(e) => set('authorName', e.target.value)} />
                        </label>
                    </section>

                    <section className="space-y-3 rounded-lg border bg-card p-4">
                        <h2 className="text-sm font-semibold">Buscadores (SEO)</h2>
                        <label className="grid gap-1 text-sm">
                            Título SEO (opcional)
                            <Input value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} />
                        </label>
                        <label className="grid gap-1 text-sm">
                            Descrição SEO (opcional)
                            <Textarea value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} rows={3} />
                        </label>
                        <label className="grid gap-1 text-sm">
                            Palavras-chave
                            <Textarea value={form.keywords} onChange={(e) => set('keywords', e.target.value)} rows={3} />
                        </label>
                    </section>

                    <section className="flex flex-wrap gap-2 rounded-lg border bg-card p-4">
                        {published && (
                            <>
                                <a className="text-sm underline" href={`/blog/${form.slug}`} target="_blank">Ver no site</a>
                                <Button size="sm" variant="outline" disabled={busy} onClick={unpublish}>Despublicar</Button>
                            </>
                        )}
                        <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={remove}><Trash2 /> Excluir</Button>
                    </section>
                </aside>
            </div>
            {picker}

            <Dialog open={publishOpen} onOpenChange={(o) => !busy && setPublishOpen(o)}>
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
                        <Button variant="outline" onClick={() => setPublishOpen(false)} disabled={busy}>Voltar e editar</Button>
                        <Button disabled={!ack || busy} onClick={() => publish(true)}>Publicar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
