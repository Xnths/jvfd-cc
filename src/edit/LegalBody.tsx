"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RichText } from "@/components/RichText";
import { useEdit } from "./EditContext";

const LegalEditor = dynamic(() => import("./LegalEditor").then((m) => m.LegalEditor), { ssr: false });

/**
 * A legal page's text. Visitors get the version João saved, or the text that ships in code.
 * While an admin is editing, it becomes a rich-text editor starting from whatever is on the page.
 */
export function LegalBody({ k, children }: { k: string; children: React.ReactNode }) {
    const { texts, editing } = useEdit();
    const saved = texts[k]?.value as { root?: unknown } | undefined;
    const ref = useRef<HTMLDivElement>(null);
    const [html, setHtml] = useState<string | null>(null);

    useEffect(() => {
        if (editing && !saved?.root && ref.current) setHtml(ref.current.innerHTML);
    }, [editing, saved]);

    if (editing && (saved?.root || html)) {
        return <LegalEditor k={k} doc={saved?.root ? (saved as never) : undefined} html={saved?.root ? undefined : html ?? undefined} />;
    }
    if (saved?.root) return <RichText content={saved} />;
    return <div ref={ref}>{children}</div>;
}
