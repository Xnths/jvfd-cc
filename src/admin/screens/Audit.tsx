'use client'

import { useResource } from '../lib/useResource'
import { LoadState, PageHeader, fmtDate } from '../components/ui'

type Entry = { id: number; at: string; actorType: string; actor: string; action: string; entityType: string; entityId: string; meta: unknown }

export function Audit() {
    const { data, error, loading } = useResource<{ entries: Entry[] }>('/audit?limit=200')
    return (
        <>
            <PageHeader title="Histórico de ações" description="Quem mudou o quê no site e no painel (logins, publicações, edições de texto, tarefas)." />
            <LoadState loading={loading} error={error} />
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Quando</th><th className="p-2">Quem</th><th className="p-2">Ação</th><th className="p-2">Item</th></tr></thead>
                    <tbody>
                        {(data?.entries ?? []).map((e) => (
                            <tr key={e.id} className="border-t">
                                <td className="p-2 whitespace-nowrap">{fmtDate(e.at)}</td>
                                <td className="p-2">{e.actor || e.actorType}</td>
                                <td className="p-2 font-mono text-xs">{e.action}</td>
                                <td className="p-2 text-xs text-muted-foreground">{[e.entityType, e.entityId].filter(Boolean).join(' · ')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}
