// Server-side client for the Go public API (clinic-api). Responses are cached by the
// unstable_cache wrappers in queries.ts, so plain fetches here are never cached by Next itself.

const API = process.env.API_INTERNAL_URL ?? "http://clinic-api:8080";

/** True when a Go API is configured (production). Without it (Docker build, local dev) pages use the copy in code. */
export const contentFromApi = () => Boolean(process.env.API_INTERNAL_URL);

export class ApiNotFound extends Error {}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API}${path}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) throw new ApiNotFound(path);
    if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
    return (await res.json()) as T;
}
