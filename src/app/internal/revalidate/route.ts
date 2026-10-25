import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";

// Called by the Go API (through the internal nginx server) after content changes. The body is
// signed with REVALIDATE_SECRET: signature = HMAC-SHA256(secret, "<timestamp>.<body>").

const MAX_SKEW_SECONDS = 300;
const ALL_PATHS = ["/", "/blog", "/sitemap.xml", "/feed.xml", "/llms.txt", "/llms-full.txt"];
const ALL_TAGS = ["texts", "posts", "treatments", "comments", "pages", "services", "settings", "profiles", "glossary", "faq"];

function valid(secret: string, ts: string, sig: string, body: string) {
    const age = Math.abs(Date.now() / 1000 - Number(ts));
    if (!Number.isFinite(age) || age > MAX_SKEW_SECONDS) return false;
    const want = createHmac("sha256", secret).update(`${ts}.${body}`).digest();
    const got = Buffer.from(sig.replace(/^sha256=/, ""), "hex");
    return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(request: Request) {
    const secret = process.env.REVALIDATE_SECRET;
    if (!secret) return new Response("not configured", { status: 503 });

    const body = await request.text();
    const ts = request.headers.get("x-timestamp") ?? "";
    const sig = request.headers.get("x-signature") ?? "";
    if (!valid(secret, ts, sig, body)) return new Response("forbidden", { status: 403 });

    let input: { tags?: string[]; paths?: string[]; all?: boolean };
    try {
        input = JSON.parse(body);
    } catch {
        return new Response("bad request", { status: 400 });
    }
    const tags = input.all ? ALL_TAGS : (input.tags ?? []);
    const paths = input.all ? ALL_PATHS : (input.paths ?? []);
    for (const tag of tags) revalidateTag(tag, { expire: 0 });
    for (const path of paths) revalidatePath(path);
    // Copy changes show on every page (header, footer, static pages): refresh the whole layout.
    if (tags.includes("texts")) revalidatePath("/", "layout");
    return Response.json({ ok: true, tags: tags.length, paths: paths.length });
}
