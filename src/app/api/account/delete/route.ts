import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function DELETE(req: NextRequest) {
    try {
        const payload = await getPayload({ config: configPromise })
        const { user } = await payload.auth({ headers: req.headers })

        if (!user || (user as { collection: string }).collection !== 'blog-users') {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        const userId = (user as { id: string }).id
        const userEmail = (user as { email: string }).email

        // 1. Anonymize all user's comments
        const { docs: userComments } = await payload.find({
            collection: 'comments',
            where: { author: { equals: userId } },
            limit: 1000,
            pagination: false,
        })

        await Promise.all(
            userComments.map((c) =>
                payload.update({
                    collection: 'comments',
                    id: c.id as string,
                    data: { body: '[comentário removido]', author: userId },
                })
            )
        )

        // 2. Unsubscribe from newsletter
        try {
            await payload.update({
                collection: 'subscribers',
                where: { email: { equals: userEmail } },
                data: { active: false },
            })
        } catch {
            // Not subscribed — ignore
        }

        // 3. Delete blog-users document
        await payload.delete({ collection: 'blog-users', id: userId })

        // 4. Clear cookie in response
        const res = NextResponse.json({ success: true })
        res.cookies.set('payload-token', '', {
            httpOnly: true,
            expires: new Date(0),
            path: '/',
        })
        return res
    } catch (err) {
        console.error('[account delete] Error:', err)
        return NextResponse.json({ error: 'Erro ao excluir conta.' }, { status: 500 })
    }
}
