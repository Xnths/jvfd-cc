'use client'

import { createContext, useContext } from 'react'
import { DecoratorNode, type LexicalNode, type NodeKey, type SerializedLexicalNode, type Spread } from 'lexical'

export type MediaRef = { id: string; url: string; alt?: string; filename?: string }

/** Lets upload nodes show a thumbnail without carrying the media URL inside the document. */
export const MediaIndex = createContext<Map<string, MediaRef>>(new Map())

type SerializedUpload = Spread<{ relationTo: 'media'; value: string; fields: null }, SerializedLexicalNode>

// Payload's documents carry `value` as a media id (string) or a populated object; we always
// write the id back, which is what the Go API stores and populates on the public side.
export class UploadNode extends DecoratorNode<React.JSX.Element> {
    __mediaId: string

    static getType() {
        return 'upload'
    }

    static clone(node: UploadNode) {
        return new UploadNode(node.__mediaId, node.__key)
    }

    static importJSON(json: SerializedUpload): UploadNode {
        const v = json.value as unknown
        const id = typeof v === 'string' ? v : ((v as { id?: string } | null)?.id ?? '')
        return new UploadNode(id)
    }

    constructor(mediaId: string, key?: NodeKey) {
        super(key)
        this.__mediaId = mediaId
    }

    exportJSON(): SerializedUpload {
        return { type: 'upload', version: 3, relationTo: 'media', value: this.__mediaId, fields: null }
    }

    createDOM() {
        return document.createElement('div')
    }

    updateDOM() {
        return false
    }

    isInline() {
        return false
    }

    decorate() {
        return <UploadView id={this.__mediaId} />
    }
}

function UploadView({ id }: { id: string }) {
    const m = useContext(MediaIndex).get(id)
    if (!m) {
        return <div className="my-4 rounded border border-dashed p-4 text-sm text-muted-foreground">Imagem não encontrada ({id})</div>
    }
    return (
        <figure className="my-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt={m.alt ?? ''} className="max-h-72 w-auto rounded-lg border" />
            {m.alt && <figcaption className="mt-1 text-xs text-muted-foreground">{m.alt}</figcaption>}
        </figure>
    )
}

export const $createUploadNode = (mediaId: string) => new UploadNode(mediaId)
export const $isUploadNode = (n: LexicalNode | null | undefined): n is UploadNode => n instanceof UploadNode
