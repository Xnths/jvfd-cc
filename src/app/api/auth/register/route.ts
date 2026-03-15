import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getPostHogClient } from '@/lib/posthog-server'

const schema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.'),
    lgpdConsent: z.literal(true, { error: 'Consentimento LGPD obrigatório.' }),
    subscribeNewsletter: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const parsed = schema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
                { status: 400 }
            )
        }

        const { name, email, password, subscribeNewsletter } = parsed.data
        const payload = await getPayload({ config: configPromise })

        await payload.create({
            collection: 'blog-users',
            data: {
                name,
                email,
                password,
                lgpdConsentedAt: new Date().toISOString(),
                active: true,
                subscribedToNewsletter: subscribeNewsletter ?? false,
            },
        })

        // Mirror to subscribers collection if opted in
        if (subscribeNewsletter) {
            try {
                await payload.create({
                    collection: 'subscribers',
                    data: {
                        email,
                        consentedAt: new Date().toISOString(),
                        active: true,
                    },
                })
            } catch {
                // Already subscribed — ignore duplicate
            }
        }

        const posthog = getPostHogClient()
        posthog.capture({
            distinctId: email,
            event: 'user_registered',
            properties: { name, subscribeNewsletter: subscribeNewsletter ?? false },
        })
        await posthog.shutdown()

        return NextResponse.json({ success: true }, { status: 201 })
    } catch (err: unknown) {
        if (
            err instanceof Error &&
            (err.message.includes('duplicate') || err.message.includes('E11000'))
        ) {
            return NextResponse.json(
                { error: 'Este e-mail já está cadastrado.' },
                { status: 409 }
            )
        }

        console.error('[register] Error:', err)
        return NextResponse.json(
            { error: 'Algo deu errado. Tente novamente.' },
            { status: 500 }
        )
    }
}
