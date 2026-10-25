"use client";

import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";
import { useEdit } from "./EditContext";

const TermEditor = dynamic(() => import("./TermEditor").then((m) => m.TermEditor), { ssr: false });

/** The glossary term as readers see it, or, while an admin edits, the same page made editable. */
export function TermSwap({ termId, children }: { termId: string; children: React.ReactNode }) {
    const { editing } = useEdit();
    if (!editing) return <>{children}</>;
    return (
        <>
            <TermEditor termRef={termId} />
            <Toaster />
        </>
    );
}
