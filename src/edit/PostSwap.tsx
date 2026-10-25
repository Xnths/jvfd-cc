"use client";

import { Toaster } from "@/components/ui/sonner";
import dynamic from "next/dynamic";
const PostInlineEditor = dynamic(() => import("./PostInlineEditor").then((m) => m.PostInlineEditor), { ssr: false });
import { useEdit } from "./EditContext";

/** Shows the post as readers see it, or, while an admin is editing, the same page made editable. */
export function PostSwap({ postId, children }: { postId: string; children: React.ReactNode }) {
    const { editing } = useEdit();
    if (!editing) return <>{children}</>;
    return (
        <>
            <PostInlineEditor postRef={postId} />
            <Toaster />
        </>
    );
}
