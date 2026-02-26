import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: NextRequest) {
    try {
        const payload = await getPayload({ config: configPromise })
        const { user } = await payload.auth({ headers: req.headers })

        if (!user || (user as unknown as { collection: string }).collection !== 'blog-users') {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        const { subscribe } = await req.json()
        const userId = (user as unknown as { id: string }).id
        const userEmail = (user as unknown as { email: string }).email

        // Update blog-users record
        await payload.update({
            collection: 'blog-users',
            id: userId,
            data: { subscribedToNewsletter: !!subscribe },
        })

        // Mirror to subscribers collection
        if (subscribe) {
            try {
                await payload.create({
                    collection: 'subscribers',
                    data: {
                        email: userEmail,
                        consentedAt: new Date().toISOString(),
                        active: true,
                    },
                })
            } catch {
                // Already exists — update active: true
                await payload.update({
                    collection: 'subscribers',
                    where: { email: { equals: userEmail } },
                    data: { active: true },
                })
            }
        } else {
            await payload.update({
                collection: 'subscribers',
                where: { email: { equals: userEmail } },
                data: { active: false },
            })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[newsletter toggle] Error:', err)
        return NextResponse.json({ error: 'Erro ao atualizar preferência.' }, { status: 500 })
    }
}
