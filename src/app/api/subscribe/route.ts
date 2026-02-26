import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const schema = z.object({
    email: z.string().email('E-mail inválido.'),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const parsed = schema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? 'E-mail inválido.' },
                { status: 400 }
            )
        }

        const { email } = parsed.data
        const payload = await getPayload({ config: configPromise })

        await payload.create({
            collection: 'subscribers',
            data: {
                email,
                consentedAt: new Date().toISOString(),
                active: true,
            },
        })

        return NextResponse.json({ success: true }, { status: 201 })
    } catch (err: unknown) {
        // MongoDB duplicate key error
        if (
            err instanceof Error &&
            (err.message.includes('duplicate') || err.message.includes('E11000'))
        ) {
            return NextResponse.json(
                { error: 'Este e-mail já está inscrito.' },
                { status: 409 }
            )
        }

        console.error('[subscribe] Error:', err)
        return NextResponse.json(
            { error: 'Algo deu errado. Tente novamente.' },
            { status: 500 }
        )
    }
}
