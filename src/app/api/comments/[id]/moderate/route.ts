import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const payload = await getPayload({ config: configPromise })

        // Must be authenticated as admin (users collection)
        const { user } = await payload.auth({ headers: req.headers })
        if (!user || (user as unknown as { collection: string }).collection !== 'users') {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        const { status } = await req.json()
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
        }

        await payload.update({
            collection: 'comments',
            id,
            data: { status },
        })

        return NextResponse.json({ success: true, status })
    } catch (err) {
        console.error('[moderate] Error:', err)
        return NextResponse.json({ error: 'Erro ao moderar.' }, { status: 500 })
    }
}
