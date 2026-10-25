'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { FilterTabs, LoadState, PageHeader, fmtDate } from '../components/ui'

export type PostRow = {
    id: string
    slug: string
    title: string
    status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived'
    publishedAt?: string | null
    updatedAt: string
    origin: string
    hasUnpublishedChanges: boolean
}

const STATUS: Record<PostRow['status'], string> = {
    draft: 'Rascunho',
    in_review: 'Em revisão',
    scheduled: 'Agendado',
    published: 'Publicado',
    archived: 'Arquivado',
}

export function slugify(s: string) {
    return s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
}

export function Posts() {
    const router = useRouter()
    const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
    const { data, error, loading } = useResource<{ posts: PostRow[] }>(`/posts${filter === 'all' ? '' : `?status=${filter}`}`)
    const [creating, setCreating] = useState(false)
    const [title, setTitle] = useState('')
    const [busy, setBusy] = useState(false)
    const posts = data?.posts ?? []

    async function create() {
        if (!title.trim()) return
        setBusy(true)
        try {
            const p = await api<{ id: string }>('/posts', { method: 'POST', json: { title: title.trim(), slug: slugify(title) } })
            router.push(`/admin/posts/${p.id}`)
        } catch (e) {
            toast.error(errorMessage(e))
            setBusy(false)
        }
    }

    return (
        <>
            <PageHeader
                title="Posts"
                description="Artigos do blog. Salvar guarda um rascunho; só “Publicar” muda o que o público vê."
                actions={<Button onClick={() => setCreating(true)}><Plus /> Novo post</Button>}
            />
            <div className="mb-4">
                <FilterTabs
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: 'all', label: 'Todos' },
                        { value: 'published', label: 'Publicados' },
                        { value: 'draft', label: 'Rascunhos' },
                    ]}
                />
            </div>
            <LoadState loading={loading} error={error} empty={!loading && posts.length === 0} emptyText="Nenhum post." />
            {posts.length > 0 && (
                <div className="overflow-x-auto rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Título</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Publicado em</TableHead>
                                <TableHead>Atualizado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {posts.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>
                                        <Link href={`/admin/posts/${p.id}`} className="font-medium underline-offset-2 hover:underline">{p.title}</Link>
                                        <p className="text-xs text-muted-foreground">/blog/{p.slug}</p>
                                    </TableCell>
                                    <TableCell className="space-x-1">
                                        <Badge variant={p.status === 'published' ? 'default' : 'outline'}>{STATUS[p.status]}</Badge>
                                        {p.status === 'published' && p.hasUnpublishedChanges && <Badge variant="secondary">Alterações não publicadas</Badge>}
                                        {p.origin !== 'manual' && <Badge variant="secondary">Automático</Badge>}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{fmtDate(p.publishedAt)}</TableCell>
                                    <TableCell className="whitespace-nowrap">{fmtDate(p.updatedAt)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={creating} onOpenChange={(o) => !busy && setCreating(o)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novo post</DialogTitle>
                        <DialogDescription>Você poderá mudar o título e o endereço depois.</DialogDescription>
                    </DialogHeader>
                    <label className="grid gap-1 text-sm">
                        Título
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} autoFocus />
                    </label>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreating(false)} disabled={busy}>Cancelar</Button>
                        <Button onClick={create} disabled={busy || !title.trim()}>{busy ? 'Criando…' : 'Criar e editar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
