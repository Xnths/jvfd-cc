'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { LoadState, PageHeader, fmtDate } from '../components/ui'

type Counts = {
    Clicks: number
    Messages: number
    Booked: number
    Paid: number
    ClicksAttr: number
    MessagesAttr: number
    BookedAttr: number
    PaidAttr: number
    MessagesUnmatched: number
}
type Funnel = {
    days: number
    threshold: number
    counts: Counts
    rates: Record<'r0' | 'r1' | 'r2' | 'r3' | 'r4', number | null>
    impressions: number
    adClicks: number
    campaignsAt?: string | null
    googleCampaigns?: { id: string; name: string; impressions: number; clicks: number }[] | null
    optimized: StageKey | ''
    primary: StageKey | ''
    primarySince?: string | null
    daysSinceSwitch?: number | null
    canSwitch: boolean
    minSwitchDays: number
    byCampaign: { campaign: string; clicks: number; messages: number; booked: number; paid: number }[]
    overduePayments: { id: string; convertedAt: string; source: string }[]
    overdueDays: number
}
type StageKey = 'whatsapp_click' | 'message_received' | 'appointment_booked'

const STAGE_NAME: Record<StageKey, string> = {
    whatsapp_click: 'B · Clique no WhatsApp',
    message_received: 'M · Mensagem recebida',
    appointment_booked: 'Q · Consulta marcada (com valor)',
}
const pct = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1).replace('.', ',')}%`)
const num = (n: number) => n.toLocaleString('pt-BR')

export function Funnel() {
    const [days, setDays] = useState(30)
    const { data, error, loading, reload } = useResource<Funnel>(`/ads/funnel?days=${days}`)
    const [saving, setSaving] = useState(false)

    async function setPrimary(stage: StageKey) {
        setSaving(true)
        try {
            await api('/ads/primary', { method: 'PUT', json: { stage } })
            toast.success('Etapa principal registrada')
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <PageHeader
                title="Funil"
                description="Do anúncio à consulta paga, e qual etapa o Google Ads deve otimizar. Só leads com identificador de clique chegam ao Google."
                actions={
                    <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        aria-label="Período"
                    >
                        {[7, 30, 90].map((d) => <option key={d} value={d}>Últimos {d} dias</option>)}
                    </select>
                }
            />
            <LoadState loading={loading} error={error} />
            {data && <Body d={data} saving={saving} onPrimary={setPrimary} />}
        </>
    )
}

function Body({ d, saving, onPrimary }: { d: Funnel; saving: boolean; onPrimary: (s: StageKey) => void }) {
    const c = d.counts
    const stages: { label: string; total: number; attr?: number; rate?: number | null; rateLabel?: string; note?: string }[] = [
        { label: 'Impressões do anúncio', total: d.impressions, note: d.campaignsAt ? `Google Ads, atualizado em ${fmtDate(d.campaignsAt)}` : 'Aguardando a tarefa ads.reconcile' },
        { label: 'Cliques no anúncio', total: d.adClicks, rate: d.rates.r0, rateLabel: 'CTR' },
        { label: 'B · Cliques no botão do WhatsApp', total: c.Clicks, attr: c.ClicksAttr, rate: d.rates.r1, rateLabel: 'botão / clique no anúncio' },
        {
            label: 'M · Mensagens recebidas', total: c.Messages + c.MessagesUnmatched, attr: c.MessagesAttr, rate: d.rates.r2, rateLabel: 'mensagem / botão',
            note: c.MessagesUnmatched > 0 ? `${c.MessagesUnmatched} sem correspondência entram no total` : undefined,
        },
        { label: 'Q · Consultas marcadas', total: c.Booked, attr: c.BookedAttr, rate: d.rates.r3, rateLabel: 'marcada / mensagem' },
        { label: 'P · Consultas pagas', total: c.Paid, attr: c.PaidAttr, rate: d.rates.r4, rateLabel: 'paga / marcada' },
    ]
    const need = d.threshold
    return (
        <div className="grid gap-6">
            <section className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Etapa</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Com identificador</TableHead>
                            <TableHead className="text-right">Taxa</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stages.map((s) => (
                            <TableRow key={s.label}>
                                <TableCell>
                                    <div className="font-medium">{s.label}</div>
                                    {s.note && <div className="text-xs text-muted-foreground">{s.note}</div>}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{num(s.total)}</TableCell>
                                <TableCell className="text-right tabular-nums">{s.attr == null ? '' : num(s.attr)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {s.rateLabel ? <>{pct(s.rate)} <span className="text-xs text-muted-foreground">{s.rateLabel}</span></> : ''}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </section>

            <section className="rounded-lg border bg-card p-4 text-sm">
                <h2 className="mb-2 font-semibold">Etapa que o Google Ads deve otimizar</h2>
                <p>
                    Recomendada pela regra (pelo menos <strong>{need}</strong> conversões com identificador em 30 dias):{' '}
                    <strong>{d.optimized ? STAGE_NAME[d.optimized] : `nenhuma ainda (menos de ${need} cliques). Lance: maximizar cliques com CPC máximo.`}</strong>
                </p>
                <p className="mt-1">
                    Principal hoje: <strong>{d.primary ? STAGE_NAME[d.primary] : 'não registrada'}</strong>
                    {d.daysSinceSwitch != null && <> · há {d.daysSinceSwitch} dia(s)</>}
                    {!d.canSwitch && <> · troca só depois de {d.minSwitchDays} dias, para não reiniciar o aprendizado do lance</>}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Isto é só o registro. A troca em si é feita na conta do Google Ads (ação principal e estratégia de lance). Apenas o perfil técnico altera o registro.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(STAGE_NAME) as StageKey[]).map((s) => (
                        <Button
                            key={s}
                            size="sm"
                            variant={d.primary === s ? 'default' : 'outline'}
                            disabled={saving || d.primary === s || !d.canSwitch}
                            onClick={() => onPrimary(s)}
                        >
                            {STAGE_NAME[s]}
                        </Button>
                    ))}
                </div>
            </section>

            {d.byCampaign.length > 0 && (
                <section className="overflow-x-auto rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campanha (utm_campaign)</TableHead>
                                <TableHead className="text-right">B</TableHead>
                                <TableHead className="text-right">M</TableHead>
                                <TableHead className="text-right">Q</TableHead>
                                <TableHead className="text-right">P</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {d.byCampaign.map((r) => (
                                <TableRow key={r.campaign}>
                                    <TableCell>{r.campaign || '(sem campanha)'}</TableCell>
                                    <TableCell className="text-right tabular-nums">{r.clicks}</TableCell>
                                    <TableCell className="text-right tabular-nums">{r.messages}</TableCell>
                                    <TableCell className="text-right tabular-nums">{r.booked}</TableCell>
                                    <TableCell className="text-right tabular-nums">{r.paid}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </section>
            )}

            {(d.googleCampaigns?.length ?? 0) > 0 && (
                <section className="overflow-x-auto rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campanha (Google Ads, 30 dias)</TableHead>
                                <TableHead className="text-right">Impressões</TableHead>
                                <TableHead className="text-right">Cliques</TableHead>
                                <TableHead className="text-right">CTR</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {d.googleCampaigns!.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.name}</TableCell>
                                    <TableCell className="text-right tabular-nums">{num(r.impressions)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{num(r.clicks)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{r.impressions ? pct(r.clicks / r.impressions) : '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </section>
            )}

            {d.overduePayments.length > 0 && (
                <section className="rounded-lg border border-destructive/40 bg-card p-4 text-sm">
                    <h2 className="mb-1 font-semibold">Consultas marcadas há mais de {d.overdueDays} dias sem pagamento registrado</h2>
                    <p className="mb-2 text-xs text-muted-foreground">
                        Registre &quot;Pago&quot; ou &quot;Não pagou&quot; em <Link className="underline" href="/admin/leads">Leads</Link>. Nada é retirado do Google Ads sozinho.
                    </p>
                    <ul className="grid gap-1 text-xs">
                        {d.overduePayments.map((o) => (
                            <li key={o.id}>{fmtDate(o.convertedAt)} · {o.source || '—'}</li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}
