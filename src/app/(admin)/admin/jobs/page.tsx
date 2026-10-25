import type { Metadata } from 'next'
import { Jobs } from '@/admin/screens/Jobs'

export const metadata: Metadata = { title: 'Tarefas' }

export default function Page() {
    return <Jobs />
}
