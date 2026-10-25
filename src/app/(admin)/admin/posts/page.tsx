import type { Metadata } from 'next'
import { Posts } from '@/admin/screens/Posts'

export const metadata: Metadata = { title: 'Posts' }

export default function Page() {
    return <Posts />
}
