'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { api, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { LoadState, PageHeader, fmtDate } from '../components/ui'

type Source = { n: number; kind: string; title: string; url: string; journal?: string; year?: string }
type Outline = { angle: string; sections: { heading: string; points: string[] }[]; cautions: string[] }
type Digest = { id: string; status: 'searching' | 'outlining' | 'writing' | 'done' | 'failed'; error: string; postSlug: string | null; outline: Outline | null; sources: Source[] | null; costUsd: number | null; lintFlags: number | null }
type Topic = { id: string; topic: string; rationale: string; source: string; targetDate: string | null; priority: number; status: string; digest?: Digest }
type Event = { id: string; name: string; startMd: string; endMd: string; topics: string[]; leadDays: number; active: boolean }
const STEP: Record<string, string> = { searching: 'Pesquisando fontes…', outlining: 'Montando a ideia…', writing: 'Escrevendo o rascunho…' }
const running = (d?: Digest) => !!d && (d.status === 'searching' || d.status === 'outlining' || d.status === 'writing')
const editUrl = (slug: string) => `/edit/enter?return=${encodeURIComponent(`/blog/${slug}`)}`
const SOURCE: Record<string, string> = { awareness: 'Data de conscientização', gsc_rising: 'Busca em alta', research: 'Pesquisa', faq: 'Pergunta', manual: 'Você' }

export function Topics() {
    const topics = useResource<{ topics: Topic[] }>('/topics?status=queued')
    const cal = useResource<{ events: Event[] }>('/calendar')
    const [newTopic, setNewTopic] = useState('')
    const [draft, setDraft] = useState({ name: '', startMd: '', endMd: '', topics: '' })

    const anyRunning = (topics.data?.topics ?? []).some((t) => running(t.digest))
    const reloadTopics = topics.reload
    useEffect(() => {
        if (!anyRunning) return
        const id = setInterval(() => void reloadTopics(), 4000)
        return () => clearInterval(id)
    }, [anyRunning, reloadTopics])

    const generate = async (t: Topic) => {
        try {
            await api(`/topics/${t.id}/digest`, { method: 'POST' })
            await topics.reload()
        } catch (e) {
            toast.error(errorMessage(e))
        }
    }

    const act = async (fn: () => Promise<unknown>, reload: () => Promise<unknown>) => {
        try {
            await fn()
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        }
    }

    return (
        <>
            <PageHeader title="Pautas" description="Assuntos que valem um post: datas de saúde mental que se aproximam, buscas em alta e ideias suas. A fila é montada toda semana. “Gerar rascunho” pesquisa fontes, propõe a ideia e escreve um rascunho para você revisar." />
            <div className="mb-3 flex gap-2">
                <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Nova ideia de post" />
                <Button disabled={!newTopic.trim()} onClick={() => act(async () => { await api('/topics', { method: 'POST', json: { topic: newTopic } }); setNewTopic('') }, topics.reload)}>Adicionar</Button>
            </div>
            <LoadState loading={topics.loading} error={topics.error} empty={!topics.loading && !topics.error && (topics.data?.topics.length ?? 0) === 0} emptyText="A fila está vazia." />
            <ul className="mb-10 space-y-2">
                {(topics.data?.topics ?? []).map((t) => (
                    <li key={t.id} className="rounded-lg border bg-card p-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">{t.topic}</p>
                                <p className="text-xs text-muted-foreground">{t.rationale}{t.targetDate && ` · para ${fmtDate(t.targetDate).split(',')[0]}`}</p>
                            </div>
                            <Badge variant="secondary">{SOURCE[t.source] ?? t.source}</Badge>
                            {running(t.digest) ? (
                                <Badge>{STEP[t.digest!.status]}</Badge>
                            ) : t.digest?.status === 'done' && t.digest.postSlug ? (
                                <a className="text-sm font-medium underline" href={editUrl(t.digest.postSlug)}>Abrir rascunho</a>
                            ) : (
                                <Button size="sm" onClick={() => generate(t)}>{t.digest?.status === 'failed' ? 'Tentar de novo' : 'Gerar rascunho'}</Button>
                            )}
                            <a className="text-sm underline" href={`/edit/enter?return=${encodeURIComponent('/blog')}`} onClick={async (e) => {
                                e.preventDefault()
                                try {
                                    const p = await api<{ slug: string }>('/posts', { method: 'POST', json: { title: t.topic } })
                                    await api(`/topics/${t.id}`, { method: 'PATCH', json: { status: 'in_progress' } })
                                    window.location.href = editUrl(p.slug)
                                } catch (err) { toast.error(errorMessage(err)) }
                            }}>Escrever</a>
                            <Button size="sm" variant="ghost" onClick={() => act(() => api(`/topics/${t.id}`, { method: 'PATCH', json: { status: 'dismissed' } }), topics.reload)}>Descartar</Button>
                        </div>
                        {t.digest?.status === 'failed' && <p role="alert" className="mt-2 text-xs text-destructive">Não deu certo: {t.digest.error || 'erro desconhecido'}</p>}
                        {t.digest?.status === 'done' && (
                            <details className="mt-2 text-sm">
                                <summary className="cursor-pointer text-muted-foreground">
                                    Ideia e fontes{!!t.digest.lintFlags && ` · ${t.digest.lintFlags} alerta(s) de redação (CFP)`}
                                </summary>
                                {t.digest.outline && (
                                    <div className="mt-2 space-y-2">
                                        <p><strong>Ângulo:</strong> {t.digest.outline.angle}</p>
                                        <ul className="list-disc pl-5">
                                            {(t.digest.outline.sections ?? []).map((sec) => <li key={sec.heading}><strong>{sec.heading}</strong>: {(sec.points ?? []).join('; ')}</li>)}
                                        </ul>
                                        {(t.digest.outline.cautions ?? []).length > 0 && (
                                            <p className="text-amber-700"><strong>Conferir:</strong> {(t.digest.outline.cautions ?? []).join(' · ')}</p>
                                        )}
                                    </div>
                                )}
                                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs">
                                    {(t.digest.sources ?? []).map((src) => (
                                        <li key={src.n}><a className="underline" href={src.url} target="_blank" rel="noopener noreferrer">{src.title}</a>{(src.journal || src.year) && ` — ${[src.journal, src.year].filter(Boolean).join(', ')}`}</li>
                                    ))}
                                </ol>
                            </details>
                        )}
                    </li>
                ))}
            </ul>

            <h2 className="mb-2 text-lg font-semibold">Calendário de datas</h2>
            <LoadState loading={cal.loading} error={cal.error} />
            <div className="mb-4 overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Data</th><th className="p-2">Início (MM-DD)</th><th className="p-2">Temas</th><th className="p-2">Ativa</th><th /></tr></thead>
                    <tbody>
                        {(cal.data?.events ?? []).map((ev) => (
                            <tr key={ev.id} className="border-t">
                                <td className="p-2">{ev.name}</td><td className="p-2 font-mono">{ev.startMd}</td><td className="p-2 text-xs">{ev.topics.join(', ')}</td>
                                <td className="p-2"><input type="checkbox" checked={ev.active} onChange={(e) => act(() => api(`/calendar/${ev.id}`, { method: 'PUT', json: { ...ev, active: e.target.checked } }), cal.reload)} /></td>
                                <td className="p-2"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm('Remover esta data?') && act(() => api(`/calendar/${ev.id}`, { method: 'DELETE' }), cal.reload)}>Remover</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_3fr_auto]">
                <Input placeholder="Nome da data" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <Input placeholder="Início MM-DD" value={draft.startMd} onChange={(e) => setDraft({ ...draft, startMd: e.target.value })} />
                <Input placeholder="Fim MM-DD" value={draft.endMd} onChange={(e) => setDraft({ ...draft, endMd: e.target.value })} />
                <Input placeholder="Temas, separados por vírgula" value={draft.topics} onChange={(e) => setDraft({ ...draft, topics: e.target.value })} />
                <Button disabled={!draft.name.trim() || !draft.startMd} onClick={() => act(async () => {
                    await api('/calendar', { method: 'POST', json: { name: draft.name, startMd: draft.startMd, endMd: draft.endMd || draft.startMd, topics: draft.topics.split(',').map((x) => x.trim()).filter(Boolean) } })
                    setDraft({ name: '', startMd: '', endMd: '', topics: '' })
                }, cal.reload)}>Adicionar</Button>
            </div>
        </>
    )
}
