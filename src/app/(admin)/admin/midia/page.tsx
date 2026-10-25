import type { Metadata } from 'next'
import { MediaLibrary } from '@/admin/screens/Media'

export const metadata: Metadata = { title: 'Mídia' }

export default function Page() {
    return <MediaLibrary />
}
