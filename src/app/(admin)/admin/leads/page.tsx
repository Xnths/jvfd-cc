import type { Metadata } from 'next'
import { Leads } from '@/admin/screens/Leads'

export const metadata: Metadata = { title: 'Leads' }

export default function Page() {
    return <Leads />
}
