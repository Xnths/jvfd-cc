import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

async function getAuthUser(req: NextRequest) {
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user || (user as unknown as { collection: string }).collection !== 'blog-users') return null
    return user as unknown as { id: string; name: string; email: string }
}

// POST /api/comments — submit a comment (authenticated blog-users only)
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) {
            return NextResponse.json({ error: 'Você precisa estar logado para comentar.' }, { status: 401 })
        }

        const { postId, body } = await req.json()

        if (!postId || typeof body !== 'string' || body.trim().length < 1) {
            return NextResponse.json({ error: 'Comentário inválido.' }, { status: 400 })
        }
        if (body.trim().length > 2000) {
            return NextResponse.json({ error: 'Comentário muito longo (máximo 2000 caracteres).' }, { status: 400 })
        }

        const payload = await getPayload({ config: configPromise })
        await payload.create({
            collection: 'comments',
            data: {
                post: postId,
                author: user.id,
                body: body.trim(),
                status: 'pending',
            },
        })

        return NextResponse.json(
            { success: true, message: 'Comentário enviado para moderação.' },
            { status: 201 }
        )
    } catch (err) {
        console.error('[comments POST] Error:', err)
        return NextResponse.json({ error: 'Erro ao enviar comentário.' }, { status: 500 })
    }
}

// GET /api/comments?postId=... — fetch approved comments for a post (public)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const postId = searchParams.get('postId')

        if (!postId) {
            return NextResponse.json({ error: 'postId obrigatório.' }, { status: 400 })
        }

        const payload = await getPayload({ config: configPromise })
        const { docs } = await payload.find({
            collection: 'comments',
            where: {
                and: [
                    { post: { equals: postId } },
                    { status: { equals: 'approved' } },
                ],
            },
            sort: 'createdAt',
            limit: 100,
            depth: 1,
        })

        const comments = docs.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt,
            authorName: typeof c.author === 'object' && c.author
                ? (c.author as { name: string }).name
                : 'Anônimo',
        }))

        return NextResponse.json({ comments })
    } catch (err) {
        console.error('[comments GET] Error:', err)
        return NextResponse.json({ error: 'Erro ao buscar comentários.' }, { status: 500 })
    }
}
