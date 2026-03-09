'use client'

import { useState } from 'react'

const STATUS_OPTIONS = [
    { label: 'Todos os status', value: 'all' },
    { label: '🖱️ Clicou no WhatsApp', value: 'clicked' },
    { label: '💬 Lead Qualificado', value: 'qualified' },
    { label: '✅ Consulta Marcada', value: 'converted' },
]

export function LeadsExportButton() {
    const today = new Date().toISOString().split('T')[0]
    const [status, setStatus] = useState('all')
    const [from, setFrom] = useState('')
    const [until, setUntil] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState<string | null>(null)

    const download = async (action: 'consulta' | 'contato') => {
        setError('')
        setLoading(action)

        const params = new URLSearchParams({ action })
        if (status !== 'all') params.set('status', status)
        if (from) params.set('from', from)
        if (until) params.set('until', until)

        try {
            const res = await fetch(`/api/leads/export?${params.toString()}`)

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data?.error ?? 'Nenhum resultado com os filtros aplicados.')
                setLoading(null)
                return
            }

            // Trigger file download from blob
            const blob = await res.blob()
            const disposition = res.headers.get('content-disposition') ?? ''
            const filenameMatch = disposition.match(/filename="([^"]+)"/)
            const filename = filenameMatch ? filenameMatch[1] : `conversoes-${action}.csv`

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch {
            setError('Erro de conexão. Tente novamente.')
        }

        setLoading(null)
    }

    const inputStyle: React.CSSProperties = {
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '5px 10px',
        fontSize: '13px',
        color: '#111827',
        background: '#fff',
        height: '32px',
        boxSizing: 'border-box',
    }

    const labelStyle: React.CSSProperties = {
        fontSize: '11px',
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: '4px',
        display: 'block',
    }

    return (
        <div style={{ padding: '16px 0 8px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                Exportar CSV → Google Ads
            </p>

            {/* Filters row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '14px' }}>

                {/* Status */}
                <div>
                    <label style={labelStyle}>Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{ ...inputStyle, paddingRight: '28px', appearance: 'auto' }}
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* Date From */}
                <div>
                    <label style={labelStyle}>De</label>
                    <input
                        type="date"
                        value={from}
                        max={until || today}
                        onChange={(e) => setFrom(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                {/* Date Until */}
                <div>
                    <label style={labelStyle}>Até</label>
                    <input
                        type="date"
                        value={until}
                        min={from || undefined}
                        max={today}
                        onChange={(e) => setUntil(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                {/* Clear filters */}
                {(status !== 'all' || from || until) && (
                    <button
                        type="button"
                        onClick={() => { setStatus('all'); setFrom(''); setUntil(''); setError('') }}
                        style={{
                            background: 'none',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            padding: '5px 12px',
                            fontSize: '12px',
                            color: '#6b7280',
                            cursor: 'pointer',
                            height: '32px',
                        }}
                    >
                        ✕ Limpar
                    </button>
                )}
            </div>

            {/* Active filter summary */}
            {(status !== 'all' || from || until) && (
                <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#6b7280' }}>
                    Filtros ativos:{' '}
                    {status !== 'all' && <strong>{STATUS_OPTIONS.find(o => o.value === status)?.label}</strong>}
                    {(from || until) && <> · {from || '…'} → {until || 'hoje'}</>}
                </p>
            )}

            {/* Download buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => download('contato')}
                    title="Exporta leads como Contato WhatsApp — Valor: R$0"
                    style={{
                        background: loading === 'contato' ? '#1d4ed8' : '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '7px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: loading !== null ? 'default' : 'pointer',
                        opacity: loading !== null ? 0.75 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    {loading === 'contato' ? '⏳ Exportando…' : '⬇️ Contato WhatsApp'}
                </button>

                <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => download('consulta')}
                    title="Exporta leads como Consulta Marcada — Valor: R$350"
                    style={{
                        background: loading === 'consulta' ? '#15803d' : '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '7px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: loading !== null ? 'default' : 'pointer',
                        opacity: loading !== null ? 0.75 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    {loading === 'consulta' ? '⏳ Exportando…' : '⬇️ Consulta Marcada'}
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div style={{
                    marginTop: '10px',
                    padding: '10px 14px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#b91c1c',
                }}>
                    ⚠️ {error}
                </div>
            )}
        </div>
    )
}
