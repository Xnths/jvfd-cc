"use client";

import { useEffect, useRef } from "react";

/** Single-line contentEditable that looks exactly like the final heading/paragraph. */
export function InlineText({ as: Tag, value, onChange, className, placeholder, multiline }: { as: "h1" | "h2" | "p" | "span"; multiline?: boolean; value: string; onChange: (v: string) => void; className: string; placeholder: string }) {
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.textContent = value;
        // set once: later typing must not be overwritten by React
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <Tag
            // @ts-expect-error ref typing for dynamic tag
            ref={ref}
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            data-placeholder={placeholder}
            className={`${className} edit-box`}
            onInput={(e: React.FormEvent<HTMLElement>) => onChange((e.currentTarget.textContent ?? "").replace(multiline ? /^$/ : /\s*\n\s*/g, " "))}
            onKeyDown={(e: React.KeyboardEvent) => !multiline && e.key === "Enter" && e.preventDefault()}
            onPaste={(e: React.ClipboardEvent) => {
                e.preventDefault();
                document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " "));
            }}
        />
    );
}

