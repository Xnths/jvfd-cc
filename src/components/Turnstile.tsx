"use client";

import { useEffect, useRef } from "react";

declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, opts: Record<string, unknown>) => string;
            reset: (id?: string) => void;
        };
    }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare Turnstile widget. `resetKey` changes → a new challenge (tokens are single use). */
export function Turnstile({ onToken, resetKey }: { onToken: (t: string) => void; resetKey?: number }) {
    const el = useRef<HTMLDivElement>(null);
    const id = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY || !el.current) return;
        const mount = () => {
            if (!window.turnstile || !el.current || id.current) return;
            id.current = window.turnstile.render(el.current, {
                sitekey: TURNSTILE_SITE_KEY,
                callback: (t: string) => onToken(t),
                "expired-callback": () => onToken(""),
            });
        };
        if (window.turnstile) return mount();
        const existing = document.getElementById("turnstile-script");
        if (existing) {
            existing.addEventListener("load", mount);
            return;
        }
        const s = document.createElement("script");
        s.id = "turnstile-script";
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.onload = mount;
        document.head.appendChild(s);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (resetKey && id.current) window.turnstile?.reset(id.current);
    }, [resetKey]);

    return <div ref={el} />;
}
