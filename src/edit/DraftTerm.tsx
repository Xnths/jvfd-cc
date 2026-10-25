"use client";

import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer";
import { TermEditor } from "./TermEditor";

/** A glossary term that is not published yet, opened at its own URL by an admin. */
export function DraftTerm({ slug }: { slug: string }) {
    return (
        <div className="min-h-screen bg-white">
            <article className="container mx-auto max-w-3xl px-4 pb-20 pt-24">
                <TermEditor termRef={slug} />
                <Toaster />
            </article>
            <Footer />
        </div>
    );
}
