import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/admin/lib/server";

// Opens a page in edit mode: draft mode lets drafts render at their real URL (blog posts that
// are not published yet). Only a signed-in admin can turn it on, and only for a path on this site.
export async function GET(req: NextRequest) {
    const base = process.env.PUBLIC_BASE_URL ?? req.nextUrl.origin;
    const ret = req.nextUrl.searchParams.get("return") ?? "/";
    const path = ret.startsWith("/") && !ret.startsWith("//") ? ret : "/";
    const admin = await getAdmin();
    if (admin === "anonymous") {
        return NextResponse.redirect(new URL(`/auth/refresh?return=${encodeURIComponent(`/edit/enter?return=${path}`)}`, base), 307);
    }
    if (admin === "unavailable") return new Response("API indisponível", { status: 503 });
    (await draftMode()).enable();
    const url = new URL(path, base);
    url.searchParams.set("edit", "1");
    return NextResponse.redirect(url, 307);
}
