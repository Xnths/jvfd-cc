"use client";

import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";
import { useEdit } from "./EditContext";

const ProfileEditor = dynamic(() => import("./ProfileEditor").then((m) => m.ProfileEditor), { ssr: false });

/** The public profile, or the same page made editable for an admin. */
export function ProfileSwap({ profileSlug, children }: { profileSlug: string; children: React.ReactNode }) {
    const { editing } = useEdit();
    if (!editing) return <>{children}</>;
    return (
        <>
            <ProfileEditor profileRef={`slug:${profileSlug}`} />
            <Toaster />
        </>
    );
}
