"use client";

import { createElement, useEffect, useRef, useState, type ElementType, type HTMLAttributes } from "react";
import dynamic from "next/dynamic";
import { useEdit } from "./EditContext";

const EditToolbar = dynamic(() => import("./EditToolbar").then((m) => m.EditToolbar), { ssr: false });

type Props = Omit<HTMLAttributes<HTMLElement>, "children"> & {
    /** Stable key, namespaced by page: `home.hero.title`. Never rename one: it is the database key. */
    k: string;
    /** The text in code. Shown until João saves his own version. */
    children: string;
    as?: ElementType;
    multiline?: boolean;
};

/** Current text for a key. For attributes (alt, aria-label…) and for client components that need a string. */
export function useText(key: string, fallback: string): string {
    const v = useEdit().texts[key]?.value;
    return typeof v === "string" ? v : fallback;
}

/**
 * A piece of copy. Visitors get plain markup; in edit mode (admins only) it gets a dashed box and
 * a click opens an inline editor with Cancelar / Salvar. Wrapping text in this is the whole API.
 */
export function Editable({ k, children, as = "span", multiline, className, ...rest }: Props) {
    const { texts, editing, activeKey, setActiveKey } = useEdit();
    const raw = texts[k]?.value;
    const value = typeof raw === "string" ? raw : children;
    const ref = useRef<HTMLElement>(null);
    const [epoch, setEpoch] = useState(0);
    const active = editing && activeKey === k;

    useEffect(() => {
        const el = ref.current;
        if (!active || !el) return;
        el.focus();
        const sel = window.getSelection();
        if (sel) {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }, [active]);

    if (!editing) {
        return createElement(as, { className: value.includes("\n") ? `${className ?? ""} whitespace-pre-line` : className, ...rest }, value);
    }

    return (
        <>
            {createElement(
                as,
                {
                    ...rest,
                    key: `${k}:${epoch}`,
                    ref,
                    className: `${className ?? ""} ${active ? "edit-active" : "edit-box"}${value.includes("\n") ? " whitespace-pre-line" : ""}`,
                    "data-edit-key": k,
                    "data-edit-multiline": multiline ? "1" : undefined,
                    contentEditable: active ? "plaintext-only" : undefined,
                    suppressContentEditableWarning: true,
                    spellCheck: active ? true : undefined,
                    onKeyDown: active
                        ? (e: React.KeyboardEvent) => {
                              if (e.key === "Escape") {
                                  setEpoch((n) => n + 1);
                                  setActiveKey(null);
                              }
                              if (e.key === "Enter" && !multiline && !e.shiftKey) {
                                  e.preventDefault();
                                  (e.currentTarget.ownerDocument.querySelector("[data-edit-save]") as HTMLElement | null)?.click();
                              }
                          }
                        : undefined,
                    onPaste: active
                        ? (e: React.ClipboardEvent) => {
                              e.preventDefault();
                              const text = e.clipboardData.getData("text/plain");
                              document.execCommand("insertText", false, multiline ? text : text.replace(/\s*\n\s*/g, " "));
                          }
                        : undefined,
                },
                value,
            )}
            {active && (
                <EditToolbar
                    k={k}
                    anchor={ref}
                    multiline={!!multiline}
                    fallback={children}
                    onCancel={() => {
                        setEpoch((n) => n + 1);
                        setActiveKey(null);
                    }}
                    onSaved={() => {
                        setEpoch((n) => n + 1);
                        setActiveKey(null);
                    }}
                />
            )}
        </>
    );
}
