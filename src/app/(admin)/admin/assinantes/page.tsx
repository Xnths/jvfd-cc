import type { Metadata } from 'next'
import { Subscribers } from '@/admin/screens/Subscribers'

export const metadata: Metadata = { title: 'Assinantes' }

export default function Page() {
    return <Subscribers />
}
