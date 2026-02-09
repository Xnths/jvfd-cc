import React from 'react'

export const RichText: React.FC<{ content: any }> = ({ content }) => {
    if (!content || !content.root || !content.root.children) {
        return null
    }

    const renderChildren = (node: any) => {
        if (node.text) {
            let text = <span key={Math.random()}>{node.text}</span>
            if (node.format & 1) text = <strong key={Math.random()}>{text}</strong>
            if (node.format & 2) text = <em key={Math.random()}>{text}</em>
            if (node.format & 8) text = <u key={Math.random()}>{text}</u>
            return text
        }

        if (!node.children) return null

        switch (node.type) {
            case 'paragraph':
                return <p key={Math.random()} className="mb-4">{node.children.map(renderChildren)}</p>
            case 'heading':
                const Tag = node.tag as any
                return <Tag key={Math.random()} className="font-bold text-slate-900 mt-8 mb-4">{node.children.map(renderChildren)}</Tag>
            case 'list':
                const ListTag = node.listType === 'number' ? 'ol' : 'ul'
                const listClass = node.listType === 'number' ? 'list-decimal' : 'list-disc'
                return <ListTag key={Math.random()} className={`${listClass} pl-6 space-y-2 marker:text-red-600`}>{node.children.map(renderChildren)}</ListTag>
            case 'listitem':
                return <li key={Math.random()}>{node.children.map(renderChildren)}</li>
            default:
                return <div key={Math.random()}>{node.children.map(renderChildren)}</div>
        }
    }

    return <div>{content.root.children.map(renderChildren)}</div>
}
