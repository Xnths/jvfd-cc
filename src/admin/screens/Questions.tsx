'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RichTextEditor, type LexicalDoc } from '@/editor/RichTextEditor'
import { ApiError, api, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { FilterTabs, LoadState, PageHeader, fmtDate } from '../components/ui'

type Status = 'new' | 'answered' | 'published' | 'rejected' | 'spam'
type Question = { id: string; question: string; status: Status; answer: LexicalDoc | null; slug: string | null; createdAt: string }
type Flag = { rule: string; match: string; message: string }
const LABEL: Record<Status, string> = { new: 'Novas', answered: 'Respondidas', published: 'Publicadas', rejected: 'Recusadas', spam: 'Spam' }

function Item({ q, reload }: { q: Question; reload: () => Promise<void> }) {
    const [text, setText] = useState(q.question)
    const answer = useRef<LexicalDoc | null>(q.answer)
    const [busy, setBusy] = useState(false)
    const [flags, setFlags] = useState<Flag[] | null>(null)
    const [ack, setAck] = useState(false)

    async function run(fn: () => Promise<void>, ok: string) {
        setBusy(true)
        try {
            await fn()
            toast.success(ok)
            await reload()
        } catch (e) {
            if (e instanceof ApiError && e.status === 422 && (e.body as { flags?: Flag[] })?.flags) setFlags((e.body as { flags: Flag[] }).flags)
            else toast.error(errorMessage(e))
        } finally {
            setBusy(false)
        }
    }
    const saveAnswer = () => api(`/faq-questions/${q.id}`, { method: 'PUT', json: { question: text, answer: answer.current } })
    const publish = (acknowledgeLint: boolean) => run(async () => { await saveAnswer(); await api(`/faq-questions/${q.id}/publish`, { method: 'POST', json: { acknowledgeLint } }); setFlags(null); setAck(false) }, 'Publicada')

    return (
        <li className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{LABEL[q.status]}</Badge>{fmtDate(q.createdAt)}
                {q.slug && <a className="underline" href={`/perguntas/${q.slug}`} target="_blank">ver no site</a>}
            </div>
            <label className="grid gap-1 text-sm font-medium">Pergunta (remova dados pessoais antes de publicar)
                <Input value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <div>
                <p className="mb-1 text-sm font-medium">Resposta</p>
                <RichTextEditor value={q.answer} media={[]} onPickImage={async () => null} onChange={(d) => { answer.current = d }} />
            </div>
            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => void (await saveAnswer()), 'Resposta salva')}>Salvar resposta</Button>
                <Button size="sm" disabled={busy} onClick={() => publish(false)}>{q.status === 'published' ? 'Atualizar publicação' : 'Publicar'}</Button>
                {q.status !== 'published' && <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => run(async () => { await api(`/faq-questions/${q.id}/reject`, { method: 'POST' }) }, 'Recusada')}>Recusar</Button>}
            </div>
            <Dialog open={!!flags} onOpenChange={(o) => !busy && !o && setFlags(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Revise antes de publicar</DialogTitle><DialogDescription>O texto contém trechos que podem ferir a Resolução CFP 010/2005.</DialogDescription></DialogHeader>
                    <ul className="list-disc space-y-1 pl-5 text-sm">{(flags ?? []).map((f, i) => <li key={i}><strong>“{f.match}”</strong> — {f.message}</li>)}</ul>
                    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} /> Revisei e quero publicar mesmo assim.</label>
                    <DialogFooter><Button variant="outline" onClick={() => setFlags(null)}>Voltar</Button><Button disabled={!ack || busy} onClick={() => publish(true)}>Publicar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </li>
    )
}

export function Questions() {
    const [filter, setFilter] = useState<Status>('new')
    const { data, error, loading, reload } = useResource<{ questions: Question[] }>(`/faq-questions?status=${filter}`)
    const list = data?.questions ?? []
    return (
        <>
            <PageHeader title="Perguntas" description="Perguntas enviadas pelo site, sem nome nem contato. Só o psicólogo responsável vê esta área." />
            <FilterTabs value={filter} onChange={(v) => setFilter(v as Status)} options={(Object.keys(LABEL) as Status[]).map((k) => ({ value: k, label: LABEL[k] }))} />
            <LoadState loading={loading} error={error} empty={!loading && !error && list.length === 0} emptyText="Nenhuma pergunta aqui." />
            <ul className="mt-4 space-y-4">{list.map((q) => <Item key={`${q.id}-${q.status}`} q={q} reload={async () => void (await reload())} />)}</ul>
        </>
    )
}
