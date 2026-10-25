"use client";

import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";

const PostInlineEditor = dynamic(() => import("./PostInlineEditor").then((m) => m.PostInlineEditor), { ssr: false });

/** A post that is not published yet, opened at its own URL by an admin. */
export function DraftPost({ slug }: { slug: string }) {
    return (
        <>
            <PostInlineEditor postRef={`slug:${slug}`} />
            <Toaster />
        </>
    );
}
