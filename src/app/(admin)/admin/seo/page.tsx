import type { Metadata } from 'next'
import { Seo } from '@/admin/screens/Seo'

export const metadata: Metadata = { title: 'Busca' }

export default function Page() {
    return <Seo />
}
