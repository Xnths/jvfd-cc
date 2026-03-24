"use client";

/**
 * Fires GA4 events that reflect observable reading engagement on a blog post.
 *
 * Two signals are tracked:
 *
 * 1. article_scroll_depth — fired once per milestone (25 / 50 / 75 / 90 %).
 *    Each event carries:
 *      - depth_percent   : the milestone reached
 *      - time_on_page_s  : seconds since the page was first rendered
 *    Reaching 75 %+ with a non-trivial time_on_page_s is the strongest
 *    single indicator that a reader found the content worth finishing.
 *
 * 2. article_reread — fired once when the user scrolls back up by ≥ 25 %
 *    after having already reached the 50 % milestone.
 *    Scrolling back up is a deliberate action; it means the reader encountered
 *    something they wanted to review, which strongly correlates with interest.
 *    The event carries:
 *      - scrolled_back_from : depth % the reader was at before reversing
 *      - time_on_page_s     : seconds on page when the reversal happened
 */

import { useEffect, useRef } from "react";
import { sendGAEvent } from "@next/third-parties/google";

const MILESTONES = [25, 50, 75, 90] as const;

export function ArticleEngagementTracker({ slug }: { slug: string }) {
    const fired = useRef(new Set<number>());
    const maxDepth = useRef(0);
    const rereadFired = useRef(false);
    const startTime = useRef(Date.now());

    useEffect(() => {
        const article = document.querySelector("article");
        if (!article) return;

        const measure = (): number => {
            const { top, height } = article.getBoundingClientRect();
            // Count content as "seen" once it passes 30 % from the top of the viewport,
            // which corresponds to where the eye typically rests while reading.
            const seen = Math.max(0, -top + window.innerHeight * 0.3);
            return Math.min(100, Math.round((seen / height) * 100));
        };

        const onScroll = () => {
            const depth = measure();
            const elapsed = Math.round((Date.now() - startTime.current) / 1000);

            // --- milestone events ---
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

            // --- re-read signal ---
            // Trigger when the reader reverses direction by ≥ 25 % after
            // having reached at least the halfway point.
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
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [slug]);

    return null;
}
