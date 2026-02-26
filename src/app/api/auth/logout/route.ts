import { NextRequest, NextResponse } from 'next/server'

const PAYLOAD_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('payload-token')?.value

        await fetch(`${PAYLOAD_URL}/api/blog-users/logout`, {
            method: 'POST',
            headers: token ? { Authorization: `JWT ${token}` } : {},
        })

        const res = NextResponse.json({ success: true })
        // Clear the cookie
        res.cookies.set('payload-token', '', {
            httpOnly: true,
            expires: new Date(0),
            path: '/',
        })
        return res
    } catch (err) {
        console.error('[logout] Error:', err)
        return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }
}
