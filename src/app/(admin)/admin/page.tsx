import type { Metadata } from 'next'
import { Dashboard } from '@/admin/screens/Dashboard'

export const metadata: Metadata = { title: 'Painel' }

export default function Page() {
    return <Dashboard />
}
