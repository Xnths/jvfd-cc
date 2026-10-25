import type { Metadata } from 'next'
import { Contatos } from '@/admin/screens/Contatos'

export const metadata: Metadata = { title: 'Contatos' }

export default function Page() {
    return <Contatos />
}
