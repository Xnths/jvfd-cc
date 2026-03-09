import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await getPayload({ config: configPromise })

        // Admin-only
        const { user } = await payload.auth({ headers: req.headers })
        if (!user || (user as unknown as { collection: string }).collection !== 'users') {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        const { id } = await params
        const body = await req.json()
        const { status, convertedAt } = body as { status: string; convertedAt?: string }

        const validStatuses = ['clicked', 'qualified', 'converted']
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
        }

        // Fetch existing doc to check convertedAt
        const existing = await payload.findByID({ collection: 'leads', id })

        const updateData: Record<string, unknown> = { status }

        // Auto-set convertedAt when first converting, or use provided date
        if (status === 'converted') {
            if (convertedAt) {
                updateData.convertedAt = convertedAt
            } else if (!existing.convertedAt) {
                updateData.convertedAt = new Date().toISOString()
            }
        }

        const updated = await payload.update({
            collection: 'leads',
            id,
            data: updateData,
        })

        return NextResponse.json({ ok: true, doc: updated })
    } catch (err) {
        console.error('[leads status PATCH] Error:', err)
        return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 })
    }
}
