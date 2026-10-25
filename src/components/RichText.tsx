import React from 'react'
import Image from 'next/image'

// Heading classes follow typographic hierarchy principles (Bringhurst):
// - Space above > space below, grouping headings with the content they introduce
// - Tighter line-height for larger type (headings don't need the leading body text requires)
// - Weight and size clearly distinguish each level without relying on colour alone
const HEADING_CLASSES: Record<string, string> = {
    h1: 'text-[2rem] font-bold leading-[1.2] tracking-tight text-slate-900 mt-14 mb-4 uppercase',
    h2: 'text-[1.75rem] font-bold leading-[1.25] tracking-tight text-slate-900 mt-12 mb-3 uppercase',
    h3: 'text-[1.375rem] font-semibold leading-[1.3] text-slate-900 mt-10 mb-2 capitalize',
    h4: 'text-[1.125rem] font-semibold leading-[1.35] text-slate-800 mt-8 mb-1.5 capitalize italic',
}

export const RichText: React.FC<{ content: any }> = ({ content }) => {
    if (!content || !content.root || !content.root.children) {
        return null
    }

    const renderChildren = (node: any, index: number = 0) => {
        const key = index
        if (node.text !== undefined) {
            if (!node.text) return null
            let text: React.ReactNode = <span key={key}>{node.text}</span>
            if (node.format & 1) text = <strong key={key}>{text}</strong>
            if (node.format & 2) text = <em key={key}>{text}</em>
            if (node.format & 8) text = <u key={key}>{text}</u>
            return text
        }

        if (node.type === 'upload') {
            const media = node.value
            if (!media || typeof media !== 'object' || !media.url) return null
            const { url, alt, width, height } = media
            return (
                <figure key={key} className="my-8">
                    <Image
                        src={url}
                        alt={alt ?? ''}
                        width={width ?? 1200}
                        height={height ?? 630}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                        className="w-full h-auto rounded-xl object-cover"
                    />
                    {alt && (
                        <figcaption className="mt-2 text-center text-sm text-slate-500 italic">
                            {alt}
                        </figcaption>
                    )}
                </figure>
            )
        }

        if (node.type === 'linebreak') return <br key={key} />
        if (node.type === 'horizontalrule') return <hr key={key} className="my-8 border-slate-200" />

        if (!node.children) return null

        switch (node.type) {
            case 'link':
            case 'autolink': {
                const url: string = node.fields?.url ?? node.url ?? '#'
                const external = /^https?:\/\//.test(url) && !url.includes('psicologojoaofernandes.com')
                return (
                    <a
                        key={key}
                        href={url}
                        className="text-green-700 underline underline-offset-2 hover:text-green-800"
                        {...(external || node.fields?.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                        {node.children.map(renderChildren)}
                    </a>
                )
            }
            case 'quote':
                return (
                    <blockquote key={key} className="my-6 border-l-4 border-green-700/40 pl-5 italic text-slate-600">
                        {node.children.map(renderChildren)}
                    </blockquote>
                )
            case 'paragraph':
                return (
                    <p key={key} className="mb-5 leading-[1.75] text-slate-700">
                        {node.children.map(renderChildren)}
                    </p>
                )
            case 'heading': {
                const Tag = node.tag as keyof React.JSX.IntrinsicElements
                const cls = HEADING_CLASSES[node.tag] ?? 'font-bold text-slate-900 mt-8 mb-3'
                return <Tag key={key} className={cls}>{node.children.map(renderChildren)}</Tag>
            }
            case 'list': {
                // pl-7 gives a proper hanging indent (~1.75rem); space-y-1.5 keeps items
                // close enough to read as a group without collapsing into a wall of text
                const ListTag = node.listType === 'number' ? 'ol' : 'ul'
                const markerClass = node.listType === 'number' ? 'list-decimal' : 'list-disc'
                return (
                    <ListTag
                        key={key}
                        className={`${markerClass} pl-7 my-5 space-y-1.5 marker:text-red-600`}
                    >
                        {node.children.map(renderChildren)}
                    </ListTag>
                )
            }
            case 'listitem':
                return (
                    <li key={key} className="leading-[1.7] text-slate-700 pl-1">
                        {node.children.map(renderChildren)}
                    </li>
                )
            default:
                return <div key={key}>{node.children.map(renderChildren)}</div>
        }
    }

    return <div>{content.root.children.map(renderChildren)}</div>
}
