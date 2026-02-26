import { NextRequest, NextResponse } from 'next/server'

const PAYLOAD_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        const payloadRes = await fetch(`${PAYLOAD_URL}/api/blog-users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        const data = await payloadRes.json()

        if (!payloadRes.ok) {
            return NextResponse.json(
                { error: data?.errors?.[0]?.message ?? 'E-mail ou senha inválidos.' },
                { status: payloadRes.status }
            )
        }

        const res = NextResponse.json({
            success: true,
            user: {
                id: data.user?.id,
                name: data.user?.name,
                email: data.user?.email,
                subscribedToNewsletter: data.user?.subscribedToNewsletter,
            },
        })

        // Forward the httpOnly cookie from Payload
        const setCookie = payloadRes.headers.get('set-cookie')
        if (setCookie) {
            res.headers.set('set-cookie', setCookie)
        }

        return res
    } catch (err) {
        console.error('[login] Error:', err)
        return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
    }
}
