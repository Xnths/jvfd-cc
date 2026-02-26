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

        if (!user || (user as { collection: string }).collection !== 'blog-users') {
            return NextResponse.json({ user: null }, { status: 200 })
        }

        return NextResponse.json({
            user: {
                id: user.id,
                name: (user as { name: string }).name,
                email: (user as { email: string }).email,
                subscribedToNewsletter: (user as { subscribedToNewsletter: boolean }).subscribedToNewsletter,
            },
        })
    } catch (err) {
        console.error('[me] Error:', err)
        return NextResponse.json({ user: null }, { status: 200 })
    }
}
