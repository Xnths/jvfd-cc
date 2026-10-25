import { draftMode } from "next/headers";
import type { NextRequest } from "next/server";
import { getAdmin } from "@/admin/lib/server";

// Behind nginx the request URL's origin is the container's (0.0.0.0:3000), so redirects are relative.
const go = (to: string) => new Response(null, { status: 307, headers: { Location: to } });
const safe = (p: string | null) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");

// Opens a page in edit mode: draft mode lets drafts render at their real URL (blog posts that
// are not published yet). Only a signed-in admin can turn it on, and only for a path on this site.
export async function GET(req: NextRequest) {
    const path = safe(req.nextUrl.searchParams.get("return"));
    const admin = await getAdmin();
    if (admin === "anonymous") return go(`/auth/refresh?return=${encodeURIComponent(`/edit/enter?return=${path}`)}`);
    if (admin === "unavailable") return new Response("API indisponível", { status: 503 });
    (await draftMode()).enable();
    return go(`${path}${path.includes("?") ? "&" : "?"}edit=1`);
}
