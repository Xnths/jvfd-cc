'use client'

import { toast } from 'sonner'
import { Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, download, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { LoadState, PageHeader, fmtDate } from '../components/ui'

type Subscriber = { id: string; email: string; consentedAt: string; active: boolean; unsubscribedAt?: string | null; source?: string }

export function Subscribers() {
    const { data, error, loading, reload } = useResource<{ subscribers: Subscriber[] }>('/subscribers')
    const subs = data?.subscribers ?? []

    async function remove(s: Subscriber) {
        if (!confirm(`Remover ${s.email}? Isso apaga o cadastro (LGPD).`)) return
        try {
            await api(`/subscribers/${s.id}`, { method: 'DELETE' })
            toast.success('Assinante removido')
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        }
    }

    return (
        <>
            <PageHeader
                title="Assinantes"
                description="Newsletter do blog."
                actions={
                    <Button variant="outline" onClick={() => download('/subscribers/export.csv', 'assinantes.csv').catch((e) => toast.error(errorMessage(e)))}>
                        <Download /> Exportar CSV
                    </Button>
                }
            />
            <LoadState loading={loading} error={error} empty={!loading && subs.length === 0} emptyText="Nenhum assinante ainda." />
            {subs.length > 0 && (
                <div className="overflow-x-auto rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>E-mail</TableHead>
                                <TableHead>Situação</TableHead>
                                <TableHead>Consentimento</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subs.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.email}</TableCell>
                                    <TableCell>
                                        {s.active ? <Badge>Ativo</Badge> : <Badge variant="outline">Descadastrado {s.unsubscribedAt ? fmtDate(s.unsubscribedAt) : ''}</Badge>}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">{fmtDate(s.consentedAt)}</TableCell>
                                    <TableCell>{s.source ?? '—'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(s)}>
                                            <Trash2 /> Remover
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </>
    )
}
