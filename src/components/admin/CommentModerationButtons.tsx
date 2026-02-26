'use client'

import { useState } from 'react'
import { useDocumentInfo, useField, Button } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

const CommentModerationButtons: TextFieldClientComponent = () => {
    const { id } = useDocumentInfo()
    const { value: currentStatus, setValue } = useField<string>({ path: 'status' })
    const [loading, setLoading] = useState<string | null>(null)
    const [message, setMessage] = useState('')

    const updateStatus = async (status: 'approved' | 'rejected' | 'pending') => {
        if (!id) return
        setLoading(status)
        setMessage('')

        try {
            const res = await fetch(`/api/comments/${id}/moderate`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })

            if (res.ok) {
                setValue(status)
                setMessage(
                    status === 'approved'
                        ? '✅ Aprovado'
                        : status === 'rejected'
                            ? '🚫 Rejeitado'
                            : '⏳ Pendente'
                )
            } else {
                setMessage('Erro ao atualizar.')
            }
        } catch {
            setMessage('Erro de conexão.')
        }

        setLoading(null)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => updateStatus('approved')}
                    disabled={loading !== null || currentStatus === 'approved'}
                    style={{
                        background: currentStatus === 'approved' ? '#15803d' : '#16a34a',
                        color: 'white',
                        padding: '6px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: currentStatus === 'approved' || loading !== null ? 'default' : 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        opacity: currentStatus === 'approved' ? 0.7 : 1,
                    }}
                >
                    {loading === 'approved' ? 'Aprovando…' : currentStatus === 'approved' ? '✓ Aprovado' : '✓ Aprovar'}
                </button>

                <button
                    type="button"
                    onClick={() => updateStatus('rejected')}
                    disabled={loading !== null || currentStatus === 'rejected'}
                    style={{
                        background: currentStatus === 'rejected' ? '#b91c1c' : '#dc2626',
                        color: 'white',
                        padding: '6px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: currentStatus === 'rejected' || loading !== null ? 'default' : 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        opacity: currentStatus === 'rejected' ? 0.7 : 1,
                    }}
                >
                    {loading === 'rejected' ? 'Rejeitando…' : currentStatus === 'rejected' ? '✗ Rejeitado' : '✗ Rejeitar'}
                </button>

                {currentStatus !== 'pending' && (
                    <button
                        type="button"
                        onClick={() => updateStatus('pending')}
                        disabled={loading !== null}
                        style={{
                            background: '#64748b',
                            color: 'white',
                            padding: '6px 18px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: loading !== null ? 'default' : 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                        }}
                    >
                        {loading === 'pending' ? 'Atualizando…' : '↩ Pendente'}
                    </button>
                )}
            </div>
            {message && (
                <span style={{ fontSize: '12px', color: '#475569' }}>{message}</span>
            )}
        </div>
    )
}

export default CommentModerationButtons
