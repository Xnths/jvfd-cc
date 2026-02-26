import type { CollectionAfterChangeHook } from 'payload'
import { Resend } from 'resend'
import { NewPostNotification } from '../emails/NewPostNotification'

const resend = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = 'https://psicologojoaofernandes.com'
const FROM_EMAIL = 'João Fernandes <newsletter@psicologojoaofernandes.com>'

export const sendNewsletterForPost: CollectionAfterChangeHook = async ({
    doc,
    previousDoc,
    operation,
    req: { payload },
}) => {
    // Only fire when transitioning TO published (not on every save)
    const justPublished =
        doc.status === 'published' &&
        (operation === 'create' || previousDoc?.status !== 'published')

    if (!justPublished) return doc

    // Non-blocking — do not hold up the CMS save
    void (async () => {
        try {
            const { docs: subscribers } = await payload.find({
                collection: 'subscribers',
                where: { active: { equals: true } },
                limit: 1000,
                pagination: false,
            })

            if (subscribers.length === 0) return

            const postDate = new Date(doc.publishedDate ?? Date.now()).toLocaleDateString(
                'pt-BR',
                { day: 'numeric', month: 'long', year: 'numeric' }
            )

            // Resend batch: max 100 per call — chunk if needed
            const BATCH_SIZE = 100
            for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
                const chunk = subscribers.slice(i, i + BATCH_SIZE)

                const emails = chunk.map((sub) => {
                    const encodedEmail = Buffer.from(sub.email).toString('base64')
                    const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?email=${encodedEmail}`

                    return {
                        from: FROM_EMAIL,
                        to: sub.email,
                        subject: `Novo artigo: ${doc.title}`,
                        react: NewPostNotification({
                            postTitle: doc.title,
                            postExcerpt: doc.excerpt ?? '',
                            postSlug: doc.slug,
                            postDate,
                            unsubscribeUrl,
                        }),
                    }
                })

                const { error } = await resend.batch.send(emails)
                if (error) {
                    payload.logger.error({ err: error }, '[newsletter] Resend batch error')
                }
            }

            payload.logger.info(
                `[newsletter] Sent to ${subscribers.length} subscribers for post "${doc.title}"`
            )
        } catch (err) {
            payload.logger.error({ err }, '[newsletter] Hook error')
        }
    })()

    return doc
}
