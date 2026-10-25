'use client'

import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { LoadState, PageHeader, fmtDate } from '../components/ui'

type Contato = { id: string; name: string; phone: string; consentAt: string; status: 'novo' | 'respondido'; createdAt: string }

export function Contatos() {
    const { data, error, loading, reload } = useResource<{ contatos: Contato[] }>('/contatos')
    const rows = data?.contatos ?? []

    async function act(fn: () => Promise<unknown>) {
        try {
            await fn()
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        }
    }

    return (
        <>
            <PageHeader title="Contatos" description="Pedidos de contato do formulário. Visível apenas para o perfil clínico (dados de pacientes)." />
            <LoadState loading={loading} error={error} empty={!loading && rows.length === 0} emptyText="Nenhum contato." />
            {rows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Recebido</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell><a className="underline-offset-2 hover:underline" href={`tel:${c.phone}`}>{c.phone}</a></TableCell>
                                    <TableCell className="whitespace-nowrap">{fmtDate(c.createdAt)}</TableCell>
                                    <TableCell><Badge variant={c.status === 'novo' ? 'default' : 'outline'}>{c.status === 'novo' ? 'Novo' : 'Respondido'}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => act(() => api(`/contatos/${c.id}`, { method: 'PATCH', json: { status: c.status === 'novo' ? 'respondido' : 'novo' } }))}
                                            >
                                                {c.status === 'novo' ? 'Marcar respondido' : 'Reabrir'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                aria-label={`Excluir contato de ${c.name}`}
                                                onClick={() => confirm('Excluir este contato?') && act(() => api(`/contatos/${c.id}`, { method: 'DELETE' }))}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
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
