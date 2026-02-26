import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(req: NextRequest) {
    try {
        const payload = await getPayload({ config: configPromise })
        const { user } = await payload.auth({ headers: req.headers })

        if (!user || (user as unknown as { collection: string }).collection !== 'blog-users') {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        const userId = (user as unknown as { id: string }).id

        // Fetch user record (without sensitive fields)
        const userData = await payload.findByID({
            collection: 'blog-users',
            id: userId,
        })

        // Fetch all user's comments
        const { docs: comments } = await payload.find({
            collection: 'comments',
            where: { author: { equals: userId } },
            limit: 1000,
            pagination: false,
        })

        const exportData = {
            exportedAt: new Date().toISOString(),
            user: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                createdAt: userData.createdAt,
                subscribedToNewsletter: userData.subscribedToNewsletter,
            },
            comments: comments.map((c) => ({
                id: c.id,
                body: c.body,
                status: c.status,
                createdAt: c.createdAt,
                postId: typeof c.post === 'object' ? (c.post as { id: string }).id : c.post,
            })),
        }

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': 'attachment; filename="meus-dados.json"',
            },
        })
    } catch (err) {
        console.error('[account export] Error:', err)
        return NextResponse.json({ error: 'Erro ao exportar dados.' }, { status: 500 })
    }
}
