import type { Metadata } from 'next'
import { Research } from '@/admin/screens/Research'

export const metadata: Metadata = { title: 'Pesquisa' }

export default function Page() {
    return <Research />
}
