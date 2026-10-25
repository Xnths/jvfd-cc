'use client'

import { useCallback, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { MediaRef } from '@/editor/UploadNode'

/**
 * Promise-based image picker: `const [picker, pick] = useMediaPicker(media)`, render `picker`
 * once, then `const id = await pick()` resolves with a media id or null when dismissed.
 */
export function useMediaPicker(media: MediaRef[]) {
    const [open, setOpen] = useState(false)
    const resolver = useRef<((id: string | null) => void) | null>(null)

    const pick = useCallback(
        () =>
            new Promise<string | null>((resolve) => {
                resolver.current = resolve
                setOpen(true)
            }),
        [],
    )

    const finish = (id: string | null) => {
        setOpen(false)
        resolver.current?.(id)
        resolver.current = null
    }

    const element = (
        <Dialog open={open} onOpenChange={(o) => !o && finish(null)}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Escolher imagem</DialogTitle>
                    <DialogDescription>Envie novas imagens na área Mídia.</DialogDescription>
                </DialogHeader>
                {media.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma imagem enviada ainda.</p>
                ) : (
                    <ul className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
                        {media.map((m) => (
                            <li key={m.id}>
                                <button onClick={() => finish(m.id)} className="block w-full overflow-hidden rounded-lg border hover:ring-2 hover:ring-primary" aria-label={`Usar ${m.alt || m.filename}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={m.url} alt={m.alt ?? ''} loading="lazy" className="aspect-square w-full object-cover" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    )
    return [element, pick] as const
}
