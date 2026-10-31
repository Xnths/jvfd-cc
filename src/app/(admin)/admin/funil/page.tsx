import type { Metadata } from 'next'
import { Funnel } from '@/admin/screens/Funnel'

export const metadata: Metadata = { title: 'Funil' }

export default function Page() {
    return <Funnel />
}
