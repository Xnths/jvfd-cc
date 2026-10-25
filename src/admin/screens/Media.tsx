'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api, errorMessage, upload } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { LoadState, PageHeader } from '../components/ui'

type Media = { id: string; filename: string; url: string; mimeType: string; filesize: number; alt?: string; caption?: string }

export function MediaLibrary() {
    const { data, error, loading, reload } = useResource<{ media: Media[] }>('/media')
    const items = data?.media ?? []
    const fileRef = useRef<HTMLInputElement>(null)
    const [staged, setStaged] = useState<File | null>(null)
    const [alt, setAlt] = useState('')
    const [busy, setBusy] = useState(false)
    const [editing, setEditing] = useState<Media | null>(null)

    async function send() {
        if (!staged) return
        if (!alt.trim()) return toast.error('Descreva a imagem (texto alternativo é obrigatório).')
        const form = new FormData()
        form.set('file', staged)
        form.set('alt', alt.trim())
        setBusy(true)
        try {
            await upload('/media', form)
            toast.success('Imagem enviada')
            setStaged(null)
            setAlt('')
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setBusy(false)
        }
    }

    async function saveMeta() {
        if (!editing) return
        if (!editing.alt?.trim()) return toast.error('O texto alternativo é obrigatório.')
        setBusy(true)
        try {
            await api(`/media/${editing.id}`, { method: 'PATCH', json: { alt: editing.alt, caption: editing.caption ?? '' } })
            setEditing(null)
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setBusy(false)
        }
    }

    async function remove(m: Media) {
        if (!confirm(`Excluir ${m.filename}?`)) return
        try {
            await api(`/media/${m.id}`, { method: 'DELETE' })
            toast.success('Imagem excluída')
            await reload()
        } catch (e) {
            toast.error(errorMessage(e)) // the API refuses when the image is still in use
        }
    }

    return (
        <>
            <PageHeader
                title="Mídia"
                description="JPEG, PNG, WebP, AVIF ou GIF até 10 MB. SVG não é aceito."
                actions={
                    <>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                            className="sr-only"
                            onChange={(e) => setStaged(e.target.files?.[0] ?? null)}
                        />
                        <Button onClick={() => fileRef.current?.click()}><Upload /> Enviar imagem</Button>
                    </>
                }
            />
            <LoadState loading={loading} error={error} empty={!loading && items.length === 0} emptyText="Nenhuma imagem enviada." />
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {items.map((m) => (
                    <li key={m.id} className="overflow-hidden rounded-lg border bg-card">
                        <button className="block w-full" onClick={() => setEditing(m)} aria-label={`Editar ${m.filename}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.url} alt={m.alt ?? ''} loading="lazy" className="aspect-square w-full object-cover" />
                        </button>
                        <div className="flex items-center justify-between gap-2 p-2">
                            <p className="truncate text-xs" title={m.filename}>{m.filename}</p>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label={`Excluir ${m.filename}`} onClick={() => remove(m)}>
                                <Trash2 />
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>

            <Dialog open={!!staged} onOpenChange={(o) => !o && !busy && setStaged(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar {staged?.name}</DialogTitle>
                        <DialogDescription>Descreva a imagem para leitores de tela e buscadores.</DialogDescription>
                    </DialogHeader>
                    <label className="grid gap-1 text-sm">
                        Texto alternativo
                        <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Ex.: Consultório com poltronas e plantas" />
                    </label>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStaged(null)} disabled={busy}>Cancelar</Button>
                        <Button onClick={send} disabled={busy}>{busy ? 'Enviando…' : 'Enviar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing?.filename}</DialogTitle>
                        <DialogDescription>URL: <code>{editing?.url}</code></DialogDescription>
                    </DialogHeader>
                    {editing && (
                        <div className="grid gap-3">
                            <label className="grid gap-1 text-sm">
                                Texto alternativo
                                <Input value={editing.alt ?? ''} onChange={(e) => setEditing({ ...editing, alt: e.target.value })} />
                            </label>
                            <label className="grid gap-1 text-sm">
                                Legenda (opcional)
                                <Input value={editing.caption ?? ''} onChange={(e) => setEditing({ ...editing, caption: e.target.value })} />
                            </label>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancelar</Button>
                        <Button onClick={saveMeta} disabled={busy}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
