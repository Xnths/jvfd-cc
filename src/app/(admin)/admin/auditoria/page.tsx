import type { Metadata } from 'next'
import { Audit } from '@/admin/screens/Audit'

export const metadata: Metadata = { title: 'Histórico' }

export default function Page() {
    return <Audit />
}
