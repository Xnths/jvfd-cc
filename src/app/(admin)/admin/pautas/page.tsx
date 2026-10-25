import type { Metadata } from 'next'
import { Topics } from '@/admin/screens/Topics'

export const metadata: Metadata = { title: 'Pautas' }

export default function Page() {
    return <Topics />
}
