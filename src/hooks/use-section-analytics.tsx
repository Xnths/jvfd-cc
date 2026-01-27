"use client";

import { useEffect, useRef } from "react";
import { logEvent } from "firebase/analytics";
import { initAnalytics } from "@/lib/firebase";

export function useSectionAnalytics(sectionId: string) {
    const startTime = useRef<number | null>(null);

    useEffect(() => {
        let observer: IntersectionObserver;

        const init = async () => {
            const analytics = await initAnalytics();
            const element = document.getElementById(sectionId);
            if (!analytics || !element) return;

            observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        startTime.current = Date.now();
                    } else if (startTime.current) {
                        const duration = Date.now() - startTime.current;

                        logEvent(analytics, "section_view", {
                            section_id: sectionId,
                            duration_ms: duration
                        });

                        startTime.current = null;
                    }
                },
                { threshold: 0.5 } // 50% visível
            );

            observer.observe(element);
        };

        init();

        return () => observer?.disconnect();
    }, [sectionId]);
}
