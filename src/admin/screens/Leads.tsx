'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, download, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { FilterTabs, LoadState, PageHeader, fmtDate } from '../components/ui'

type Lead = {
    id: string
    gclid: string
    clickedAt: string
    status: 'clicked' | 'qualified' | 'converted'
    qualifiedAt?: string | null
    convertedAt?: string | null
    hasClickId: boolean
    source: string
    pageUrl: string
    landingUrl: string
    convertedValue?: number | null
    suggestedValue: number
    uploads: Partial<Record<Stage, Upload>>
}

type Stage = 'whatsapp_click' | 'message_received' | 'appointment_booked'
type Upload = { status: 'pending' | 'retry' | 'succeeded' | 'failed' | 'skipped'; code?: string | null; message?: string | null; attempts: number }

const STAGE_LABEL: Record<Stage, string> = { whatsapp_click: 'Clique', message_received: 'Mensagem', appointment_booked: 'Consulta' }
const UPLOAD_LABEL: Record<Upload['status'], string> = {
    pending: 'na fila', retry: 'tentando de novo', succeeded: 'enviado', failed: 'falhou', skipped: 'não enviado',
}
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const STATUS_LABEL: Record<Lead['status'], string> = {
    clicked: 'Clicou no WhatsApp',
    qualified: 'Lead qualificado',
    converted: 'Consulta marcada',
}
// Only these statuses fire a GA4 event (Google Ads imports them as conversions).
const GA4_EVENT: Partial<Record<Lead['status'], string>> = { qualified: 'contacted', converted: 'scheduled' }

const pad = (n: number) => String(n).padStart(2, '0')
const toLocalInput = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

type Filter = 'all' | Lead['status']

export function Leads() {
    const [filter, setFilter] = useState<Filter>('all')
    const { data, error, loading, reload } = useResource<{ leads: Lead[] }>(
        `/leads?limit=500${filter === 'all' ? '' : `&status=${filter}`}`,
    )
    const [pending, setPending] = useState<{ lead: Lead; status: Lead['status']; when: string; value: string } | null>(null)
    const [saving, setSaving] = useState(false)

    function ask(lead: Lead, status: Lead['status']) {
        if (lead.status === status) return
        // The qualified time defaults to the click time; other events default to now.
        const base = status === 'qualified' ? new Date(lead.clickedAt) : new Date()
        setPending({ lead, status, when: toLocalInput(base), value: String(lead.convertedValue ?? lead.suggestedValue) })
    }

    async function confirm() {
        if (!pending) return
        const { lead, status, when, value } = pending
        const at = new Date(when)
        if (Number.isNaN(at.getTime())) return toast.error('Data inválida')
        setSaving(true)
        try {
            const body: Record<string, string | number> = { status }
            if (status === 'converted') {
                const v = Number(value.replace(',', '.'))
                if (value.trim() === '' || !Number.isFinite(v) || v < 0) {
                    setSaving(false)
                    return toast.error('Valor inválido')
                }
                body.value = v
            }
            if (status === 'qualified') body.qualifiedAt = at.toISOString()
            if (status === 'converted') body.convertedAt = at.toISOString()
            await api(`/leads/${lead.id}/status`, { method: 'PATCH', json: body })
            const event = GA4_EVENT[status]
            if (event && typeof window.gtag === 'function') {
                window.gtag('event', event, { lead_id: lead.id, lead_status: status, conversion_time: at.toISOString() })
            }
            toast.success(`Status atualizado: ${STATUS_LABEL[status]}`)
            setPending(null)
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setSaving(false)
        }
    }

    async function resend(lead: Lead) {
        try {
            await api(`/leads/${lead.id}/resend`, { method: 'POST' })
            toast.success('Reenvio agendado')
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        }
    }

    const leads = data?.leads ?? []
    return (
        <>
            <PageHeader
                title="Leads"
                description="Cliques no WhatsApp vindos de anúncios. Marque o andamento para enviar a conversão ao Google Ads."
            />
            <AdsPanel />
            <div className="mb-4">
                <FilterTabs
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: 'all', label: 'Todos' },
                        { value: 'clicked', label: 'Clicaram' },
                        { value: 'qualified', label: 'Qualificados' },
                        { value: 'converted', label: 'Consulta marcada' },
                    ]}
                />
            </div>
            <LoadState loading={loading} error={error} empty={!loading && leads.length === 0} emptyText="Nenhum lead neste filtro." />
            {leads.length > 0 && (
                <div className="overflow-x-auto rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Clique</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Qualificado</TableHead>
                                <TableHead>Consulta</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead>Envio ao Google Ads</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leads.map((l) => (
                                <TableRow key={l.id}>
                                    <TableCell className="whitespace-nowrap">{fmtDate(l.clickedAt)}</TableCell>
                                    <TableCell>
                                        <Badge variant={l.status === 'converted' ? 'default' : l.status === 'qualified' ? 'secondary' : 'outline'}>
                                            {STATUS_LABEL[l.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{fmtDate(l.qualifiedAt)}</TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {fmtDate(l.convertedAt)}
                                        {l.status === 'converted' && l.convertedValue != null && <div className="text-xs text-muted-foreground">{brl(l.convertedValue)}</div>}
                                    </TableCell>
                                    <TableCell className="max-w-[14rem] text-xs" title={`${l.pageUrl}\n${l.landingUrl}`}>
                                        <div className="truncate font-medium">{l.source || '—'}</div>
                                        <div className="truncate text-muted-foreground">{l.gclid || (l.hasClickId ? 'gbraid/wbraid' : 'sem identificador')}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => {
                                                const u = l.uploads[s]
                                                if (!u) return null
                                                return (
                                                    <Badge
                                                        key={s}
                                                        variant={u.status === 'failed' ? 'destructive' : u.status === 'succeeded' ? 'default' : 'outline'}
                                                        title={[u.code, u.message].filter(Boolean).join(': ')}
                                                    >
                                                        {STAGE_LABEL[s]}: {UPLOAD_LABEL[u.status]}
                                                    </Badge>
                                                )
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            {(['clicked', 'qualified', 'converted'] as const).map((s) => (
                                                <Button
                                                    key={s}
                                                    size="sm"
                                                    variant={l.status === s ? 'default' : 'outline'}
                                                    disabled={l.status === s}
                                                    onClick={() => ask(l, s)}
                                                >
                                                    {s === 'clicked' ? 'Clicou' : s === 'qualified' ? 'Qualificado' : 'Marcada'}
                                                </Button>
                                            ))}
                                            {Object.values(l.uploads).some((u) => u?.status === 'failed') && (
                                                <Button size="sm" variant="outline" onClick={() => resend(l)}>Reenviar</Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <ExportPanel />

            <Dialog open={!!pending} onOpenChange={(o) => !o && !saving && setPending(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar mudança de status</DialogTitle>
                        <DialogDescription>
                            {pending && (
                                <>
                                    Novo status: <strong>{STATUS_LABEL[pending.status]}</strong>.{' '}
                                    {GA4_EVENT[pending.status]
                                        ? <>Será enviado o evento GA4 <code>{GA4_EVENT[pending.status]}</code> com o horário abaixo.</>
                                        : 'Nenhum evento GA4 é enviado para este status.'}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {pending && pending.status === 'converted' && (
                        <label className="grid gap-1 text-sm">
                            Valor da consulta (R$)
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={pending.value}
                                onChange={(e) => setPending({ ...pending, value: e.target.value })}
                            />
                            <span className="text-xs text-muted-foreground">
                                Sugestão: {brl(pending.lead.suggestedValue)}. Altere se este paciente tem outro valor. É o valor enviado ao Google Ads.
                            </span>
                        </label>
                    )}
                    {pending && pending.status !== 'clicked' && (
                        <label className="grid gap-1 text-sm">
                            Horário do evento
                            <Input
                                type="datetime-local"
                                value={pending.when}
                                onChange={(e) => setPending({ ...pending, when: e.target.value })}
                            />
                        </label>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPending(null)} disabled={saving}>Cancelar</Button>
                        <Button onClick={confirm} disabled={saving}>{saving ? 'Salvando…' : 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

function ExportPanel() {
    const [status, setStatus] = useState<Filter>('all')
    const [from, setFrom] = useState('')
    const [until, setUntil] = useState('')
    const [busy, setBusy] = useState<string | null>(null)

    async function run(action: 'contato' | 'consulta') {
        const q = new URLSearchParams({ action })
        if (status !== 'all') q.set('status', status)
        if (from) q.set('from', from)
        if (until) q.set('until', until)
        setBusy(action)
        try {
            await download(`/leads/export?${q}`, `conversoes-${action}.csv`)
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setBusy(null)
        }
    }

    return (
        <section className="mt-8 rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Exportar CSV → Google Ads</h2>
            <div className="mb-4 flex flex-wrap items-end gap-4">
                <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                    <select
                        className="h-9 rounded-md border bg-background px-2 text-sm normal-case tracking-normal text-foreground"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as Filter)}
                    >
                        <option value="all">Todos os status</option>
                        <option value="clicked">Clicou no WhatsApp</option>
                        <option value="qualified">Lead qualificado</option>
                        <option value="converted">Consulta marcada</option>
                    </select>
                </label>
                <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    De
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Até
                    <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
                </label>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy !== null} onClick={() => run('contato')}>
                    <Download /> {busy === 'contato' ? 'Gerando…' : 'Contato WhatsApp (valor R$ 0)'}
                </Button>
                <Button disabled={busy !== null} onClick={() => run('consulta')}>
                    <Download /> {busy === 'consulta' ? 'Gerando…' : 'Consulta marcada'}
                </Button>
            </div>
        </section>
    )
}

type AdsStats = {
    enabled: boolean
    counts: Partial<Record<Upload['status'], number>>
    medianSeconds?: number | null
    p95Seconds?: number | null
    authError?: { error: string; at: string } | null
}

function AdsPanel() {
    const { data } = useResource<AdsStats>('/ads/stats')
    if (!data) return null
    if (!data.enabled) {
        return <p className="mb-4 rounded-lg border bg-card p-3 text-sm text-muted-foreground">Envio automático ao Google Ads desligado (credenciais GADS_* não configuradas).</p>
    }
    const secs = (n?: number | null) => (n == null ? '—' : n < 90 ? `${Math.round(n)} s` : `${Math.round(n / 60)} min`)
    return (
        <section className="mb-4 rounded-lg border bg-card p-3 text-sm">
            {data.authError && (
                <p className="mb-2 font-medium text-destructive">Erro de autenticação no Google Ads: envios parados. {data.authError.error}</p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="font-semibold">Últimos 7 dias</span>
                {(Object.keys(UPLOAD_LABEL) as Upload['status'][]).map((s) => (
                    <span key={s}>{UPLOAD_LABEL[s]}: <strong>{data.counts[s] ?? 0}</strong></span>
                ))}
                <span>tempo até o envio (mediana / p95): <strong>{secs(data.medianSeconds)} / {secs(data.p95Seconds)}</strong></span>
            </div>
        </section>
    )
}
