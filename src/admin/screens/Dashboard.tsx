'use client'

import Link from 'next/link'
import { useResource } from '../lib/useResource'
import { LoadState, PageHeader } from '../components/ui'

type Stats = {
    pendingComments: number
    newLeads: number
    qualifiedLeads: number
    subscribers: number
    draftPosts: number
    newQuestions: number
    newContatos: number
    openSuggestions: number
}

const CARDS: { key: keyof Stats; label: string; href?: string }[] = [
    { key: 'pendingComments', label: 'Comentários pendentes', href: '/admin/comentarios' },
    { key: 'newLeads', label: 'Leads novos (cliques)', href: '/admin/leads' },
    { key: 'qualifiedLeads', label: 'Leads qualificados', href: '/admin/leads' },
    { key: 'subscribers', label: 'Assinantes ativos', href: '/admin/assinantes' },
    { key: 'newContatos', label: 'Contatos novos', href: '/admin/contatos' },
    { key: 'draftPosts', label: 'Posts em rascunho' },
]

export function Dashboard() {
    const { data, error, loading } = useResource<Stats>('/dashboard')
    return (
        <>
            <PageHeader title="Painel" description="Resumo do que precisa de atenção." />
            <LoadState loading={loading} error={error} />
            {data && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {CARDS.map(({ key, label, href }) => {
                        const body = (
                            <>
                                <p className="text-3xl font-semibold tabular-nums">{data[key]}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                            </>
                        )
                        const cls = 'rounded-lg border bg-card p-5 shadow-sm'
                        return href ? (
                            <Link key={key} href={href} className={`${cls} transition-colors hover:bg-muted/50`}>{body}</Link>
                        ) : (
                            <div key={key} className={cls}>{body}</div>
                        )
                    })}
                </div>
            )}
        </>
    )
}
