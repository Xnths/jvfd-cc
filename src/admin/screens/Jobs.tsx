'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { LoadState, PageHeader, fmtDate } from '../components/ui'

type Job = { name: string; lastStatus: string | null; lastStartedAt: string | null; lastSummary: unknown }
type Run = { id: string; job: string; key: string; status: 'running' | 'ok' | 'failed'; startedAt: string; finishedAt: string | null; summary: unknown; error: string }

const DESCRIPTION: Record<string, string> = {
    'retention.cleanup': 'Apaga comentários recusados, sessões vencidas e perguntas recusadas. Os leads antigos só são apagados depois que o João confirma o prazo (RETENTION_LEADS_DAYS no servidor).',
    'newsletter.reconcile': 'Recoloca na fila campanhas de e-mail que ficaram travadas.',
    'gsc.sync': 'Busca os dados do Google Search Console.',
    'seo.opportunities': 'Procura oportunidades de SEO nos dados do Search Console.',
    'trends.radar': 'Monta a fila de pautas (datas de conscientização e buscas em alta).',
    'research.fetch': 'Busca artigos científicos novos (PubMed, SciELO).',
    'research.digest': 'Cria um rascunho de post com a pesquisa da semana.',
    'topics.backfill_references': 'Preenche as Referências dos rascunhos gerados a partir de uma pauta que ficaram sem elas (usa as fontes da pesquisa). Não mexe em post publicado nem em rascunho que já tem referências.',
}
const VARIANT = { ok: 'default', failed: 'destructive', running: 'secondary' } as const

export function Jobs() {
    const jobs = useResource<{ jobs: Job[] }>('/jobs')
    const runs = useResource<{ runs: Run[] }>('/jobs/runs?limit=40')
    const [busy, setBusy] = useState<string | null>(null)

    async function trigger(name: string) {
        setBusy(name)
        try {
            await api(`/jobs/${name}/trigger`, { method: 'POST' })
            toast.success('Tarefa iniciada')
            setTimeout(() => { void runs.reload(); void jobs.reload() }, 1500)
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setBusy(null)
        }
    }

    return (
        <>
            <PageHeader title="Tarefas automáticas" description="O Airflow roda estas tarefas nos horários combinados. Você também pode rodar uma agora; o site funciona normalmente mesmo com o Airflow parado." />
            <LoadState loading={jobs.loading} error={jobs.error} />
            <ul className="mb-8 grid gap-3 md:grid-cols-2">
                {(jobs.data?.jobs ?? []).map((j) => (
                    <li key={j.name} className="rounded-lg border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-mono text-sm font-semibold">{j.name}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{DESCRIPTION[j.name] ?? ''}</p>
                                <p className="mt-2 text-xs text-muted-foreground">{j.lastStartedAt ? `Última: ${fmtDate(j.lastStartedAt)}` : 'Nunca rodou'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {j.lastStatus && <Badge variant={VARIANT[j.lastStatus as keyof typeof VARIANT] ?? 'secondary'}>{j.lastStatus}</Badge>}
                                <Button size="sm" variant="outline" disabled={busy === j.name} onClick={() => trigger(j.name)}><Play /> Rodar agora</Button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
            <h2 className="mb-2 text-lg font-semibold">Execuções recentes</h2>
            <LoadState loading={runs.loading} error={runs.error} empty={!runs.loading && !runs.error && (runs.data?.runs.length ?? 0) === 0} emptyText="Nenhuma execução ainda." />
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Tarefa</th><th className="p-2">Quando</th><th className="p-2">Estado</th><th className="p-2">Resultado</th></tr></thead>
                    <tbody>
                        {(runs.data?.runs ?? []).map((r) => (
                            <tr key={r.id} className="border-t align-top">
                                <td className="p-2 font-mono">{r.job}<div className="text-xs text-muted-foreground">{r.key.startsWith('manual-') ? 'manual' : r.key}</div></td>
                                <td className="p-2 whitespace-nowrap">{fmtDate(r.startedAt)}</td>
                                <td className="p-2"><Badge variant={VARIANT[r.status]}>{r.status}</Badge></td>
                                <td className="p-2 text-xs"><code className="break-all">{r.error || JSON.stringify(r.summary)}</code></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}
