import { draftMode } from "next/headers";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const ret = req.nextUrl.searchParams.get("return");
    (await draftMode()).disable();
    return new Response(null, { status: 307, headers: { Location: ret && ret.startsWith("/") && !ret.startsWith("//") ? ret : "/" } });
}
