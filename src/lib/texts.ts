import { unstable_cache } from "next/cache";
import { apiGet, contentFromApi } from "@/lib/api";

/** One editable text as stored by the Go API (`site_texts`). */
export type TextEntry = { value: unknown; version: number };
export type TextMap = Record<string, TextEntry>;

const cached = unstable_cache(
    async (): Promise<TextMap> => (await apiGet<{ texts: TextMap }>("/api/v1/public/texts")).texts ?? {},
    ["site-texts"],
    { tags: ["texts"], revalidate: 86400 },
);

/** Overrides João saved inline. Empty when the API is off or unreachable (the code defaults show). */
export async function getTexts(): Promise<TextMap> {
    if (!contentFromApi()) return {};
    try {
        return await cached();
    } catch {
        return {};
    }
}

/** Resolves a string text: the saved override, else the default in code. */
export function pickText(texts: TextMap, key: string, fallback: string): string {
    const v = texts[key]?.value;
    return typeof v === "string" ? v : fallback;
}
