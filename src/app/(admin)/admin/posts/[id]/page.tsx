import type { Metadata } from 'next'
import { PostEditor } from '@/admin/screens/PostEditor'

export const metadata: Metadata = { title: 'Editar post' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <PostEditor id={id} />
}
