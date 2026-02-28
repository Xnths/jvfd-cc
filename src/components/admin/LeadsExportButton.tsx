'use client'

import { useState } from 'react'

export function LeadsExportButton() {
    const today = new Date().toISOString().split('T')[0]
    const [since, setSince] = useState('')

    const download = (action: 'consulta' | 'contato') => {
        const url = `/api/leads/export?action=${action}${since ? `&since=${since}` : ''}`
        window.location.href = url
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', flexWrap: 'wrap' }}>
            <label htmlFor="leads-since" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                Exportar CSV para Google Ads:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>a partir de</span>
                <input
                    id="leads-since"
                    type="date"
                    value={since}
                    max={today}
                    onChange={(e) => setSince(e.target.value)}
                    style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', color: '#111827', background: '#fff' }}
                />
                <button
                    type="button"
                    onClick={() => download('contato')}
                    style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    title="Exporta todos os leads que clicaram no WhatsApp — Conversão: Contato WhatsApp"
                >
                    ⬇️ Contato WhatsApp
                </button>
                <button
                    type="button"
                    onClick={() => download('consulta')}
                    style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    title="Exporta apenas leads com status Consulta Marcada — Conversão: Consulta Marcada"
                >
                    ⬇️ Consulta Marcada
                </button>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>(vazio = todos)</span>
            </div>
        </div>
    )
}
