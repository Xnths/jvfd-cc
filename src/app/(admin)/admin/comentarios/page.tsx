import type { Metadata } from 'next'
import { Comments } from '@/admin/screens/Comments'

export const metadata: Metadata = { title: 'Comentários' }

export default function Page() {
    return <Comments />
}
