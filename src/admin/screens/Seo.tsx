'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { FilterTabs, LoadState, PageHeader, fmtDate } from '../components/ui'

type Totals = { clicks: number; impressions: number; ctr: number; position: number }
type Overview = { configured: boolean; through: string | null; current: Totals; previous: Totals; topPages: Top[]; topQueries: Top[] }
type Top = { key: string; clicks: number; impressions: number; position: number | null }
type Suggestion = { id: string; kind: string; target: string; query: string; metrics: Record<string, unknown>; proposal: { hint?: string; action?: string }; status: string; updatedAt: string }

const KIND: Record<string, string> = {
    striking_distance: 'Perto da 1ª página', low_ctr: 'Título pouco clicado', content_gap: 'Assunto sem conteúdo', cannibalization: 'Páginas competindo',
    decay: 'Queda de cliques', faq_candidate: 'Pergunta frequente', rising: 'Busca em alta',
}
const APPLY_LABEL: Record<string, string> = { content_gap: 'Criar rascunho de post', faq_candidate: 'Enviar para Perguntas' }

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
function delta(cur: number, prev: number) {
    if (!prev) return ''
    const d = ((cur - prev) / prev) * 100
    return `${d >= 0 ? '+' : ''}${d.toFixed(0)}% vs. 4 semanas antes`
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return <div className="rounded-lg border bg-card p-4"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
}

export function Seo() {
    const ov = useResource<Overview>('/seo/overview')
    const [status, setStatus] = useState('new')
    const sg = useResource<{ suggestions: Suggestion[] }>(`/seo/suggestions?status=${status}`)
    const [busy, setBusy] = useState<string | null>(null)
    const o = ov.data

    async function apply(s: Suggestion) {
        setBusy(s.id)
        try {
            const r = await api<{ next: string }>(`/seo/suggestions/${s.id}/apply`, { method: 'POST' })
            // Pages open in edit mode; the inbox and drafts open where they live.
            window.location.href = r.next.startsWith('/admin') ? r.next : `/edit/enter?return=${encodeURIComponent(r.next || '/')}`
        } catch (e) {
            toast.error(errorMessage(e))
            setBusy(null)
        }
    }
    async function dismiss(s: Suggestion) {
        setBusy(s.id)
        try {
            await api(`/seo/suggestions/${s.id}/dismiss`, { method: 'POST' })
            await sg.reload()
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setBusy(null)
        }
    }

    return (
        <>
            <PageHeader title="Busca no Google" description="Dados do Google Search Console e sugestões para o site aparecer melhor. Nada muda sozinho: cada sugestão espera a sua decisão." />
            <LoadState loading={ov.loading} error={ov.error} />
            {o && !o.configured && (
                <div className="mb-6 rounded-md border border-amber-500/50 bg-amber-50 p-4 text-sm">
                    O Search Console ainda não está conectado, então não há dados. Falta criar a conta de serviço e colocar GSC_CREDENTIALS_FILE e GSC_SITE_URL no servidor (passo a passo em docs/setup-accounts.md).
                </div>
            )}
            {o?.through && (
                <>
                    <p className="mb-3 text-sm text-muted-foreground">Últimas 4 semanas, até {fmtDate(o.through).split(',')[0]}.</p>
                    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Card label="Cliques" value={String(o.current.clicks)} sub={delta(o.current.clicks, o.previous.clicks)} />
                        <Card label="Impressões" value={String(o.current.impressions)} sub={delta(o.current.impressions, o.previous.impressions)} />
                        <Card label="CTR" value={pct(o.current.ctr)} />
                        <Card label="Posição média" value={o.current.position.toFixed(1)} />
                    </div>
                    <div className="mb-8 grid gap-6 lg:grid-cols-2">
                        {([['Páginas', o.topPages], ['Buscas', o.topQueries]] as const).map(([title, rows]) => (
                            <section key={title}>
                                <h2 className="mb-2 font-semibold">{title} mais clicadas</h2>
                                <table className="w-full text-sm"><tbody>{rows.map((r) => (
                                    <tr key={r.key} className="border-t"><td className="py-1.5 pr-2 break-all">{r.key || '/'}</td><td className="whitespace-nowrap px-2 text-right">{r.clicks} cliques</td><td className="whitespace-nowrap pl-2 text-right text-muted-foreground">pos. {r.position?.toFixed(1) ?? '—'}</td></tr>
                                ))}</tbody></table>
                            </section>
                        ))}
                    </div>
                </>
            )}
            <h2 className="mb-2 text-lg font-semibold">Sugestões</h2>
            <FilterTabs value={status} onChange={setStatus} options={[{ value: 'new', label: 'Novas' }, { value: 'accepted', label: 'Aplicadas' }, { value: 'dismissed', label: 'Descartadas' }]} />
            <LoadState loading={sg.loading} error={sg.error} empty={!sg.loading && !sg.error && (sg.data?.suggestions.length ?? 0) === 0} emptyText="Nenhuma sugestão por enquanto." />
            <ul className="mt-4 space-y-3">
                {(sg.data?.suggestions ?? []).map((s) => (
                    <li key={s.id} className="rounded-lg border bg-card p-4">
                        <div className="mb-1 flex flex-wrap items-center gap-2"><Badge variant="secondary">{KIND[s.kind] ?? s.kind}</Badge>{s.target && <code className="text-xs">{s.target}</code>}{s.query && <span className="text-sm font-medium">“{s.query}”</span>}</div>
                        <p className="text-sm text-muted-foreground">{s.proposal.hint}</p>
                        {status === 'new' && (
                            <div className="mt-3 flex gap-2">
                                <Button size="sm" disabled={busy === s.id} onClick={() => apply(s)}>{APPLY_LABEL[s.kind] ?? 'Abrir a página para ajustar'}</Button>
                                <Button size="sm" variant="ghost" disabled={busy === s.id} onClick={() => dismiss(s)}>Descartar</Button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </>
    )
}
