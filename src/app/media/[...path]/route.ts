import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves uploaded media from the volume mounted at MEDIA_DIR. nginx serves /media/* directly
// for browsers; this route exists so the Next.js image optimizer (which fetches /media/...
// from this very server) can read the same files.

const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR ?? "/app/media");

const TYPES: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path: segments } = await params;
    const file = path.resolve(MEDIA_DIR, ...segments.map(decodeURIComponent));
    const type = TYPES[path.extname(file).toLowerCase()];
    if (!type || !file.startsWith(MEDIA_DIR + path.sep)) return new Response("not found", { status: 404 });
    try {
        const data = await readFile(file);
        return new Response(new Uint8Array(data), {
            headers: {
                "Content-Type": type,
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "public, max-age=2592000, immutable",
            },
        });
    } catch {
        return new Response("not found", { status: 404 });
    }
}
