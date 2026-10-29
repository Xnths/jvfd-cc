"use client";

/**
 * Fires GA4 events that reflect observable reading engagement on a blog post.
 *
 * 1. article_scroll_depth — once per milestone (25 / 50 / 75 / 90 %), measured
 *    against the article body (.prose), not the whole <article> (which also holds
 *    the footer CTA, newsletter and comments). Carries depth_percent and
 *    time_on_page_s (engaged seconds: only time the tab was visible).
 *
 * 2. article_reread — once, when the reader scrolls back up by ≥ 25 % after
 *    having reached 50 %. Carries scrolled_back_from and time_on_page_s.
 *
 * 3. article_read — at most once per pageview, when the reader has reached
 *    READ_DEPTH % of the body AND has READ_SECONDS of engaged time, whichever
 *    comes last. Carries slug, read_time_s and word_count. Use this one as the
 *    Google Ads optimization goal.
 */

import { useEffect, useRef } from "react";
import { sendGAEvent } from "@next/third-parties/google";

const MILESTONES = [25, 50, 75, 90] as const;
const READ_DEPTH = 75;
const READ_SECONDS = 30;

export function ArticleEngagementTracker({ slug }: { slug: string }) {
    const fired = useRef(new Set<number>());
    const maxDepth = useRef(0);
    const rereadFired = useRef(false);
    const readFired = useRef(false);
    const engaged = useRef(0);

    useEffect(() => {
        const article = document.querySelector("article");
        if (!article) return;
        const body = article.querySelector<HTMLElement>(".prose") ?? article;
        const words = (body.innerText || "").split(/\s+/).filter(Boolean).length;

        const measure = (): number => {
            const { top, height } = body.getBoundingClientRect();
            if (height <= 0) return 0;
            // Content counts as "seen" once it passes 30 % from the top of the viewport.
            const seen = Math.max(0, -top + window.innerHeight * 0.3);
            return Math.min(100, Math.round((seen / height) * 100));
        };

        const checkRead = () => {
            if (readFired.current) return;
            if (maxDepth.current >= READ_DEPTH && engaged.current >= READ_SECONDS) {
                readFired.current = true;
                sendGAEvent("event", "article_read", {
                    slug,
                    read_time_s: engaged.current,
                    word_count: words,
                });
            }
        };

        const onScroll = () => {
            const depth = measure();
            const elapsed = engaged.current;

            for (const milestone of MILESTONES) {
                if (depth >= milestone && !fired.current.has(milestone)) {
                    fired.current.add(milestone);
                    sendGAEvent("event", "article_scroll_depth", {
                        slug,
                        depth_percent: milestone,
                        time_on_page_s: elapsed,
                    });
                }
            }

            if (
                !rereadFired.current &&
                maxDepth.current >= 50 &&
                depth < maxDepth.current - 25
            ) {
                rereadFired.current = true;
                sendGAEvent("event", "article_reread", {
                    slug,
                    scrolled_back_from: maxDepth.current,
                    time_on_page_s: elapsed,
                });
            }

            if (depth > maxDepth.current) {
                maxDepth.current = depth;
            }
            checkRead();
        };

        const tick = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            engaged.current += 1;
            checkRead();
        }, 1000);

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.clearInterval(tick);
        };
    }, [slug]);

    return null;
}
