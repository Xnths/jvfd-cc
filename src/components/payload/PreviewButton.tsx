'use client'

import { useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

export const PreviewButton: React.FC = () => {
    const { slug } = useFormFields(([fields]) => fields)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const href = slug?.value ? `/${slug.value as string}` : '#'
    const hasSlug = Boolean(slug?.value)

    return (
        <div className="flex flex-col gap-4 mt-4 border-t pt-4">
            <p className="text-sm font-bold text-gray-500 mb-2">
                Live Preview (Mobile View)
            </p>

            {hasSlug ? (
                <div className="relative w-full overflow-hidden border border-gray-300 rounded bg-white" style={{ height: '600px' }}>
                    <iframe
                        src={href}
                        className="w-full h-full"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Live Preview"
                    />
                </div>
            ) : (
                <div className="p-4 text-center text-sm text-gray-400 border border-dashed rounded bg-gray-50">
                    Preencha o campo "Slug" e salve para visualizar o preview.
                </div>
            )}

            {hasSlug && (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 underline text-center block mt-2">
                    Abrir em nova aba
                </a>
            )}
        </div>
    )
}
