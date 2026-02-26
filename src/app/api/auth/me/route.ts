import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('payload-token')?.value
        if (!token) {
            return NextResponse.json({ user: null }, { status: 200 })
        }

        const payload = await getPayload({ config: configPromise })
        const { user } = await payload.auth({ headers: req.headers })

        if (!user || (user as unknown as { collection: string }).collection !== 'blog-users') {
            return NextResponse.json({ user: null }, { status: 200 })
        }

        const u = user as unknown as {
            id: string
            name: string
            email: string
            subscribedToNewsletter: boolean
        }

        return NextResponse.json({
            user: {
                id: u.id,
                name: u.name,
                email: u.email,
                subscribedToNewsletter: u.subscribedToNewsletter,
            },
        })
    } catch (err) {
        console.error('[me] Error:', err)
        return NextResponse.json({ user: null }, { status: 200 })
    }
}
