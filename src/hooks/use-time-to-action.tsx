"use client";

import { useRef } from "react";

export function useTimeToAction() {
    const startTimeRef = useRef<number | null>(null);

    if (startTimeRef.current === null && typeof window !== "undefined") {
        startTimeRef.current = Date.now();
    }

    const getElapsedTime = () => {
        if (!startTimeRef.current) return null;
        return Date.now() - startTimeRef.current;
    };

    return { getElapsedTime };
}
