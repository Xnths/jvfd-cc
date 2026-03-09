'use client'

import { useState, useRef } from 'react'
import { useDocumentInfo, useField } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'

declare global {
    interface Window {
        gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void
    }
}

const STATUS_LABELS: Record<string, string> = {
    clicked: '🖱️ Clicou no WhatsApp',
    qualified: '💬 Lead Qualificado',
    converted: '✅ Consulta Marcada',
}

// GA4 event name per status — only qualified and converted fire events
const GA4_EVENT: Record<string, string | undefined> = {
    qualified: 'contacted',
    converted: 'scheduled',
}

function formatBRDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const LeadsStatusButtons: SelectFieldClientComponent = () => {
    const { id } = useDocumentInfo()
    const { value: currentStatus, setValue } = useField<string>({ path: 'status' })

    const [loading, setLoading] = useState<string | null>(null)
    const [feedback, setFeedback] = useState('')

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<string | null>(null)
    const [pendingTime, setPendingTime] = useState<Date | null>(null)
    const dialogRef = useRef<HTMLDialogElement>(null)

    const requestStatusChange = (status: string) => {
        if (!id || status === currentStatus) return
        setPendingStatus(status)
        setPendingTime(new Date())
        setDialogOpen(true)
        dialogRef.current?.showModal()
    }

    const cancelChange = () => {
        setPendingStatus(null)
        setPendingTime(null)
        setDialogOpen(false)
        dialogRef.current?.close()
    }

    const confirmChange = async () => {
        if (!pendingStatus || !id) return
        const status = pendingStatus
        const eventTime = pendingTime ?? new Date()

        setDialogOpen(false)
        dialogRef.current?.close()
        setLoading(status)
        setFeedback('')

        try {
            const res = await fetch(`/api/leads/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })

            if (res.ok) {
                setValue(status)
                setFeedback(`✅ Salvo: ${STATUS_LABELS[status] ?? status}`)

                // Fire GA4 event (only for qualified/converted)
                const gaEventName = GA4_EVENT[status]
                if (gaEventName) {
                    const params = {
                        lead_id: String(id),
                        lead_status: status,
                        conversion_time: eventTime.toISOString(),
                    }
                    if (typeof window.gtag === 'function') {
                        window.gtag('event', gaEventName, params)
                        console.log(`[GA4] event fired: "${gaEventName}"`, params)
                    } else {
                        console.warn('[GA4] window.gtag not available — event NOT sent:', gaEventName, params)
                    }
                }
            } else {
                const data = await res.json().catch(() => ({}))
                setFeedback(`Erro: ${data?.error ?? 'Falha ao atualizar.'}`)
            }
        } catch {
            setFeedback('Erro de conexão.')
        }

        setLoading(null)
        setPendingStatus(null)
        setPendingTime(null)
    }

    const buttons: { label: string; status: string; bg: string; activeBg: string }[] = [
        { label: '🖱️ Clicou', status: 'clicked', bg: '#6b7280', activeBg: '#4b5563' },
        { label: '💬 Lead Qualificado', status: 'qualified', bg: '#2563eb', activeBg: '#1d4ed8' },
        { label: '✅ Consulta Marcada', status: 'converted', bg: '#16a34a', activeBg: '#15803d' },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {buttons.map(({ label, status, bg, activeBg }) => {
                    const isActive = currentStatus === status
                    const isLoading = loading === status
                    return (
                        <button
                            key={status}
                            type="button"
                            disabled={loading !== null || isActive}
                            onClick={() => requestStatusChange(status)}
                            style={{
                                background: isActive ? activeBg : bg,
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 14px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: isActive || loading !== null ? 'default' : 'pointer',
                                opacity: isActive ? 0.75 : 1,
                                transition: 'opacity 0.15s',
                            }}
                        >
                            {isLoading ? 'Salvando…' : isActive ? `${label} ✓` : label}
                        </button>
                    )
                })}
            </div>

            {feedback && (
                <span style={{ fontSize: '12px', color: '#475569' }}>{feedback}</span>
            )}

            {/* Native confirmation dialog */}
            <dialog
                ref={dialogRef}
                style={{
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    padding: '28px 32px',
                    maxWidth: '420px',
                    width: '100%',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    background: '#fff',
                }}
            >
                {dialogOpen && pendingStatus && pendingTime && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#111827' }}>
                            Confirmar evento GA4
                        </p>
                        <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                        }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>
                                <strong>Evento:</strong> {STATUS_LABELS[pendingStatus] ?? pendingStatus}
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>
                                <strong>Hora:</strong> {formatBRDateTime(pendingTime)}
                            </p>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                            Ao confirmar, o status será salvo e um evento de conversão será enviado ao GA4.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={cancelChange}
                                style={{
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    padding: '8px 18px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmChange}
                                style={{
                                    background: '#16a34a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 18px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Confirmar e Salvar
                            </button>
                        </div>
                    </div>
                )}
            </dialog>
        </div>
    )
}

export default LeadsStatusButtons
