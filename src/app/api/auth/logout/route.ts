import { NextResponse } from 'next/server'

export async function POST() {
    const res = NextResponse.json({ success: true })
    // Clear the Payload session cookie
    res.cookies.set('payload-token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    })
    return res
}
