'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    $createParagraphNode,
    $getSelection,
    $insertNodes,
    $isRangeSelection,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_LOW,
    FORMAT_TEXT_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
    UNDO_COMMAND,
    type EditorState,
} from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode, REMOVE_LIST_COMMAND } from '@lexical/list'
import { $isLinkNode, AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $setBlocksType } from '@lexical/selection'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import { Bold, Heading2, Heading3, ImageIcon, Italic, Link2, List, ListOrdered, Minus, Pilcrow, Quote, Redo2, Underline, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { $createUploadNode, MediaIndex, UploadNode, type MediaRef } from './UploadNode'

export type LexicalDoc = { root: Record<string, unknown> } & Record<string, unknown>

const EMPTY: LexicalDoc = {
    root: {
        type: 'root', version: 1, format: '', indent: 0, direction: null,
        children: [{ type: 'paragraph', version: 1, format: '', indent: 0, direction: null, textFormat: 0, textStyle: '', children: [] }],
    },
}

type Block = 'paragraph' | 'h2' | 'h3' | 'h4' | 'quote' | 'bullet' | 'number'

function Toolbar({ media, onPickImage, inline }: { media: MediaRef[]; onPickImage: () => Promise<string | null>; inline?: boolean }) {
    const [editor] = useLexicalComposerContext()
    const [state, setState] = useState({ bold: false, italic: false, underline: false, link: false, block: 'paragraph' as Block })
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)

    useEffect(() => {
        const read = () => {
            const sel = $getSelection()
            if (!$isRangeSelection(sel)) return
            const anchor = sel.anchor.getNode()
            const top = anchor.getKey() === 'root' ? anchor : anchor.getTopLevelElementOrThrow()
            let block: Block = 'paragraph'
            if ($isListNode(top)) block = top.getListType() === 'number' ? 'number' : 'bullet'
            else if ($isHeadingNode(top)) block = top.getTag() as Block
            else if (top.getType() === 'quote') block = 'quote'
            const parent = anchor.getParent()
            setState({
                bold: sel.hasFormat('bold'),
                italic: sel.hasFormat('italic'),
                underline: sel.hasFormat('underline'),
                link: $isLinkNode(parent) || $isLinkNode(anchor),
                block,
            })
        }
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => editorState.read(read)),
            editor.registerCommand(SELECTION_CHANGE_COMMAND, () => { read(); return false }, COMMAND_PRIORITY_LOW),
            editor.registerCommand(CAN_UNDO_COMMAND, (v) => { setCanUndo(v); return false }, COMMAND_PRIORITY_LOW),
            editor.registerCommand(CAN_REDO_COMMAND, (v) => { setCanRedo(v); return false }, COMMAND_PRIORITY_LOW),
        )
    }, [editor])

    const setBlock = (b: Block) => {
        if (b === 'bullet' || b === 'number') {
            if (state.block === b) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
            else editor.dispatchCommand(b === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
            return
        }
        editor.update(() => {
            const sel = $getSelection()
            if (!$isRangeSelection(sel)) return
            const same = state.block === b
            $setBlocksType(sel, () =>
                same || b === 'paragraph' ? $createParagraphNode()
                : b === 'quote' ? $createQuoteNode()
                : $createHeadingNode(b),
            )
        })
    }

    const link = () => {
        if (state.link) return editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
        const url = window.prompt('Endereço do link (https://… ou /caminho)')
        if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim())
    }

    const image = async () => {
        const id = await onPickImage()
        if (!id) return
        editor.update(() => $insertNodes([$createUploadNode(id)]))
    }

    const Btn = ({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) => (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={on}
            className={cn('rounded p-1.5 hover:bg-muted disabled:opacity-40', active && 'bg-primary/10 text-primary')}
        >
            {children}
        </button>
    )

    return (
        <div
            className={cn('sticky z-[55] flex flex-wrap items-center gap-0.5 border bg-white p-1.5 shadow-sm', inline ? 'mb-6 rounded-lg' : 'top-0 z-10 border-0 border-b bg-card')}
            style={inline ? { top: 'calc(var(--admin-bar-h, 0px) + 4.25rem)' } : undefined}
            role="toolbar"
            aria-label="Formatação"
        >
            <Btn label="Desfazer" on={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo}><Undo2 className="h-4 w-4" /></Btn>
            <Btn label="Refazer" on={() => editor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo}><Redo2 className="h-4 w-4" /></Btn>
            <span className="mx-1 h-5 w-px bg-border" />
            <Btn label="Parágrafo" on={() => setBlock('paragraph')} active={state.block === 'paragraph'}><Pilcrow className="h-4 w-4" /></Btn>
            <Btn label="Título (H2)" on={() => setBlock('h2')} active={state.block === 'h2'}><Heading2 className="h-4 w-4" /></Btn>
            <Btn label="Subtítulo (H3)" on={() => setBlock('h3')} active={state.block === 'h3'}><Heading3 className="h-4 w-4" /></Btn>
            <Btn label="Citação" on={() => setBlock('quote')} active={state.block === 'quote'}><Quote className="h-4 w-4" /></Btn>
            <Btn label="Lista" on={() => setBlock('bullet')} active={state.block === 'bullet'}><List className="h-4 w-4" /></Btn>
            <Btn label="Lista numerada" on={() => setBlock('number')} active={state.block === 'number'}><ListOrdered className="h-4 w-4" /></Btn>
            <span className="mx-1 h-5 w-px bg-border" />
            <Btn label="Negrito" on={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} active={state.bold}><Bold className="h-4 w-4" /></Btn>
            <Btn label="Itálico" on={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} active={state.italic}><Italic className="h-4 w-4" /></Btn>
            <Btn label="Sublinhado" on={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} active={state.underline}><Underline className="h-4 w-4" /></Btn>
            <Btn label={state.link ? 'Remover link' : 'Inserir link'} on={link} active={state.link}><Link2 className="h-4 w-4" /></Btn>
            <span className="mx-1 h-5 w-px bg-border" />
            <Btn label="Inserir imagem" on={image} disabled={media.length === 0 && false}><ImageIcon className="h-4 w-4" /></Btn>
            <Btn label="Linha separadora" on={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}><Minus className="h-4 w-4" /></Btn>
        </div>
    )
}

const theme = {
    paragraph: 'mb-4',
    quote: 'my-4 border-l-4 border-green-700/40 pl-4 italic text-slate-600',
    heading: { h2: 'mt-8 mb-3 text-2xl font-bold', h3: 'mt-6 mb-2 text-xl font-semibold', h4: 'mt-5 mb-1.5 text-lg font-semibold italic' },
    list: { ul: 'mb-4 list-disc pl-6', ol: 'mb-4 list-decimal pl-6', listitem: 'mb-1' },
    link: 'text-green-700 underline underline-offset-2',
    text: { bold: 'font-bold', italic: 'italic', underline: 'underline' },
}

// Same classes the public RichText renderer uses, so the inline editor looks like the final page.
const publicTheme = {
    paragraph: 'mb-5 leading-[1.75] text-slate-700',
    quote: 'my-6 border-l-4 border-green-700/40 pl-5 italic text-slate-600',
    heading: {
        h1: 'text-[2rem] font-bold leading-[1.2] tracking-tight text-slate-900 mt-14 mb-4 uppercase',
        h2: 'text-[1.75rem] font-bold leading-[1.25] tracking-tight text-slate-900 mt-12 mb-3 uppercase',
        h3: 'text-[1.375rem] font-semibold leading-[1.3] text-slate-900 mt-10 mb-2 capitalize',
        h4: 'text-[1.125rem] font-semibold leading-[1.35] text-slate-800 mt-8 mb-1.5 capitalize italic',
    },
    list: { ul: 'list-disc pl-7 my-5 space-y-1.5 marker:text-red-600', ol: 'list-decimal pl-7 my-5 space-y-1.5 marker:text-red-600', listitem: 'leading-[1.7] text-slate-700 pl-1' },
    link: 'text-green-700 underline underline-offset-2',
    text: { bold: 'font-bold', italic: 'italic', underline: 'underline' },
}

/**
 * Lexical editor for posts and rich-text blocks. It reads and writes the same Lexical JSON the
 * public RichText renderer and the Go API use. `value` is only read on mount (use `key` to reset).
 */
export function RichTextEditor({
    value,
    media,
    onChange,
    onPickImage,
    inline = false,
}: {
    inline?: boolean
    value: LexicalDoc | null | undefined
    media: MediaRef[]
    onChange: (doc: LexicalDoc) => void
    onPickImage: () => Promise<string | null>
}) {
    const index = useMemo(() => new Map(media.map((m) => [m.id, m])), [media])
    const initial = useMemo(() => JSON.stringify(value?.root ? value : EMPTY), [value])

    const handle = (state: EditorState) => onChange(state.toJSON() as unknown as LexicalDoc)

    return (
        <MediaIndex.Provider value={index}>
            <LexicalComposer
                initialConfig={{
                    namespace: 'clinic-editor',
                    theme: inline ? publicTheme : theme,
                    editorState: initial,
                    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, HorizontalRuleNode, UploadNode],
                    onError: (e) => console.error('[editor]', e),
                }}
            >
                <div className={inline ? undefined : 'rounded-lg border bg-card'}>
                    <Toolbar media={media} onPickImage={onPickImage} inline={inline} />
                    <div className="relative">
                        <RichTextPlugin
                            contentEditable={<ContentEditable aria-label="Conteúdo" className={inline ? 'min-h-[16rem] outline-none' : 'min-h-[24rem] px-5 py-4 text-base leading-relaxed outline-none'} />}
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                    </div>
                    <HistoryPlugin />
                    <ListPlugin />
                    <LinkPlugin />
                    <HorizontalRulePlugin />
                    <OnChangePlugin onChange={handle} ignoreSelectionChange />
                </div>
            </LexicalComposer>
        </MediaIndex.Provider>
    )
}
