'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, errorMessage } from '../lib/adminFetch'
import { useResource } from '../lib/useResource'
import { FilterTabs, LoadState, PageHeader, fmtDate } from '../components/ui'

type Item = { id: string; source: string; title: string; authors: string; journal: string; publishedOn: string | null; abstract: string; url: string; doi: string; pubTypes: string[]; score: number; status: string; postSlug: string | null }

export function Research() {
    const [status, setStatus] = useState('new')
    const { data, error, loading, reload } = useResource<{ items: Item[] }>(`/research/items?status=${status}`)
    const [busy, setBusy] = useState(false)

    async function digest() {
        setBusy(true)
        try {
            await api('/jobs/research.digest/trigger', { method: 'POST' })
            toast.success('Montando o rascunho. Ele aparece em Posts (origem: pesquisa) em instantes.')
            setTimeout(() => void reload(), 2500)
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setBusy(false)
        }
    }
    async function dismiss(id: string) {
        try {
            await api(`/research/items/${id}/dismiss`, { method: 'POST' })
            await reload()
        } catch (e) {
            toast.error(errorMessage(e))
        }
    }

    return (
        <>
            <PageHeader
                title="Pesquisa"
                description="Artigos novos do PubMed e do SciELO sobre os temas combinados. Toda semana um rascunho de post é montado com os melhores, sempre com as fontes citadas: nada é publicado sem a sua revisão."
                actions={<Button variant="outline" disabled={busy} onClick={digest}>Montar rascunho agora</Button>}
            />
            <FilterTabs value={status} onChange={setStatus} options={[{ value: 'new', label: 'Novos' }, { value: 'drafted', label: 'Em rascunho' }, { value: 'dismissed', label: 'Descartados' }]} />
            <LoadState loading={loading} error={error} empty={!loading && !error && (data?.items.length ?? 0) === 0} emptyText="Nenhum artigo por aqui. A busca roda toda semana e precisa do NCBI_EMAIL configurado no servidor." />
            <ul className="mt-4 space-y-3">
                {(data?.items ?? []).map((i) => (
                    <li key={i.id} className="rounded-lg border bg-card p-4">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{i.source === 'pubmed' ? 'PubMed' : 'SciELO'}</Badge>{i.pubTypes.slice(0, 2).join(', ')}{i.publishedOn && fmtDate(i.publishedOn).split(',')[0]}</div>
                        <a href={i.doi ? `https://doi.org/${i.doi}` : i.url} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-2 hover:underline">{i.title}</a>
                        <p className="text-sm text-muted-foreground">{i.authors} · {i.journal}</p>
                        {i.abstract && <p className="mt-2 line-clamp-3 text-sm">{i.abstract}</p>}
                        <div className="mt-2 flex gap-2">
                            {i.postSlug && <a className="text-sm underline" href={`/edit/enter?return=${encodeURIComponent(`/blog/${i.postSlug}`)}`}>Abrir o rascunho</a>}
                            {i.status === 'new' && <Button size="sm" variant="ghost" onClick={() => dismiss(i.id)}>Descartar</Button>}
                        </div>
                    </li>
                ))}
            </ul>
        </>
    )
}
