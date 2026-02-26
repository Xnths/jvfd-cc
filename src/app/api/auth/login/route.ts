import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'E-mail e senha obrigatórios.' }, { status: 400 })
        }

        const payload = await getPayload({ config: configPromise })

        // Use Payload's local API — no HTTP, works inside Docker
        const result = await payload.login({
            collection: 'blog-users',
            data: { email, password },
        })

        if (!result.user) {
            return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 })
        }

        const u = result.user as unknown as {
            id: string
            name: string
            email: string
            subscribedToNewsletter: boolean
        }

        const res = NextResponse.json({
            success: true,
            user: {
                id: u.id,
                name: u.name,
                email: u.email,
                subscribedToNewsletter: u.subscribedToNewsletter,
            },
        })

        // Set the httpOnly session cookie manually
        if (result.token) {
            res.cookies.set('payload-token', result.token, {
                httpOnly: true,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7, // 7 days
            })
        }

        return res
    } catch (err: unknown) {
        // Payload throws on invalid credentials
        const message = err instanceof Error ? err.message : ''
        if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('not found')) {
            return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 })
        }
        console.error('[login] Error:', err)
        return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
    }
}
