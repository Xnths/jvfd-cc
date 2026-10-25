import type { Metadata } from 'next'
import { Questions } from '@/admin/screens/Questions'

export const metadata: Metadata = { title: 'Perguntas' }

export default function Page() {
    return <Questions />
}
