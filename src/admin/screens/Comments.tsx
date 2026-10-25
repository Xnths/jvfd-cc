'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Trash2, X, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { FilterTabs, LoadState, PageHeader, fmtDate } from '../components/ui'

type Status = 'pending' | 'approved' | 'rejected' | 'spam'
type Comment = {
    id: string
    postTitle: string
    postSlug: string
    authorName: string
    body: string
    status: Status
    createdAt: string
}

const LABEL: Record<Status, string> = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', spam: 'Spam' }

export function Comments() {
    const [filter, setFilter] = useState<Status>('pending')
    const { data, error, loading, reload } = useResource<{ comments: Comment[] }>(`/comments?status=${filter}`)
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [busy, setBusy] = useState(false)
    const comments = data?.comments ?? []

    async function act(fn: () => Promise<unknown>, ok: string) {
        setBusy(true)
        try {
            await fn()
            toast.success(ok)
            setSelected(new Set())
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setBusy(false)
        }
    }

    const moderate = (id: string, status: Status) =>
        act(() => api(`/comments/${id}`, { method: 'PATCH', json: { status } }), `Comentário: ${LABEL[status].toLowerCase()}`)
    const bulk = (status: Status) =>
        act(() => api('/comments/bulk', { method: 'POST', json: { ids: [...selected], status } }), `${selected.size} comentário(s) atualizados`)
    const remove = (id: string) => {
        if (!confirm('Excluir este comentário definitivamente?')) return
        void act(() => api(`/comments/${id}`, { method: 'DELETE' }), 'Comentário excluído')
    }

    function toggle(id: string) {
        const next = new Set(selected)
        if (!next.delete(id)) next.add(id)
        setSelected(next)
    }

    return (
        <>
            <PageHeader title="Comentários" description="Só comentários aprovados aparecem no site." />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <FilterTabs
                    value={filter}
                    onChange={(v) => { setFilter(v); setSelected(new Set()) }}
                    options={(Object.keys(LABEL) as Status[]).map((v) => ({ value: v, label: LABEL[v] }))}
                />
                {selected.size > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <span>{selected.size} selecionado(s)</span>
                        <Button size="sm" disabled={busy} onClick={() => bulk('approved')}>Aprovar</Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk('rejected')}>Rejeitar</Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk('spam')}>Spam</Button>
                    </div>
                )}
            </div>
            <LoadState loading={loading} error={error} empty={!loading && comments.length === 0} emptyText="Nenhum comentário neste filtro." />
            <ul className="space-y-3">
                {comments.map((c) => (
                    <li key={c.id} className="rounded-lg border bg-card p-4">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                className="mt-1.5 h-4 w-4"
                                checked={selected.has(c.id)}
                                onChange={() => toggle(c.id)}
                                aria-label={`Selecionar comentário de ${c.authorName}`}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <strong>{c.authorName}</strong>
                                    <span className="text-muted-foreground">em</span>
                                    <a href={`/blog/${c.postSlug}`} target="_blank" className="truncate underline-offset-2 hover:underline">{c.postTitle}</a>
                                    <Badge variant="outline">{LABEL[c.status]}</Badge>
                                    <span className="ml-auto text-xs text-muted-foreground">{fmtDate(c.createdAt)}</span>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{c.body}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {c.status !== 'approved' && (
                                        <Button size="sm" disabled={busy} onClick={() => moderate(c.id, 'approved')}><Check /> Aprovar</Button>
                                    )}
                                    {c.status !== 'rejected' && (
                                        <Button size="sm" variant="outline" disabled={busy} onClick={() => moderate(c.id, 'rejected')}><X /> Rejeitar</Button>
                                    )}
                                    {c.status !== 'spam' && (
                                        <Button size="sm" variant="outline" disabled={busy} onClick={() => moderate(c.id, 'spam')}><ShieldAlert /> Spam</Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={() => remove(c.id)}>
                                        <Trash2 /> Excluir
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </>
    )
}
