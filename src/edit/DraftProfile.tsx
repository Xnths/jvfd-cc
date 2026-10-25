"use client";

import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer";
import { ProfileEditor } from "./ProfileEditor";

/** A hidden profile, opened at its own URL by an admin. */
export function DraftProfile({ slug }: { slug: string }) {
    return (
        <div className="min-h-screen bg-white">
            <article className="container mx-auto max-w-3xl px-4 pb-20 pt-24">
                <ProfileEditor profileRef={`slug:${slug}`} />
                <Toaster />
            </article>
            <Footer />
        </div>
    );
}
