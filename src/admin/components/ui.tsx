'use client'

import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
                <h1 className="font-serif text-2xl">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}

export function LoadState({ loading, error, empty, emptyText = 'Nada por aqui ainda.' }: {
    loading: boolean
    error: string | null
    empty?: boolean
    emptyText?: string
}) {
    if (error) return <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>
    if (loading) return <p className="p-3 text-sm text-muted-foreground">Carregando…</p>
    if (empty) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
    return null
}

export function FilterTabs<T extends string>({ value, onChange, options }: {
    value: T
    onChange: (v: T) => void
    options: { value: T; label: string }[]
}) {
    return (
        <div className="flex flex-wrap gap-1" role="tablist">
            {options.map((o) => (
                <button
                    key={o.value}
                    role="tab"
                    aria-selected={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        value === o.value ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

const dtf = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
export function fmtDate(iso?: string | null) {
    return iso ? dtf.format(new Date(iso)) : '—'
}
