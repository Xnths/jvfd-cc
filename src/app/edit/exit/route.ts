import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const base = process.env.PUBLIC_BASE_URL ?? req.nextUrl.origin;
    const ret = req.nextUrl.searchParams.get("return") ?? "/";
    (await draftMode()).disable();
    return NextResponse.redirect(new URL(ret.startsWith("/") && !ret.startsWith("//") ? ret : "/", base), 307);
}
