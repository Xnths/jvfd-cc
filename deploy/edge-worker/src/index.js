// Edge safety net in front of the Raspberry Pi (see CLAUDE.md, "Edge fallback").
//
// - Every request is passed to the origin unchanged.
// - A cron (every 5 min) stores a snapshot of the ad landing pages and the assets they use in KV.
// - When the origin answers 5xx/530, throws, or is too slow, GET/HEAD navigations get the snapshot
//   (or a small page with the WhatsApp button), and POST /api/leads is queued and replayed later.
// - "?edge=origin" disables all of that, so monitors can see the real origin state.

const HOST = "psicologojoaofernandes.com";
const PAGES = ["/", "/?lgbt=true", "/avaliacao-neuropsicologica"];
const LANDING_PATHS = new Set(["/", "/avaliacao-neuropsicologica"]);
const PAGE_TIMEOUT_MS = 8000;
const PAGE_REFRESH_MS = 30 * 60 * 1000;
const ASSET_TTL_S = 30 * 24 * 3600;
const WHATSAPP = "5511955591996";
const DEFAULT_MESSAGE = "Olá, gostaria de agendar uma sessão.";
// The ad upload tells these leads apart by this exact text: do not change it.
const AVALIACAO_MESSAGE = "Olá, gostaria de informações sobre a avaliação neuropsicológica.";

export function pageKey(url) {
    const u = new URL(url);
    const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : "/";
    if (!LANDING_PATHS.has(path)) return null;
    return `page:${path}${path === "/" && u.searchParams.get("lgbt") === "true" ? "?lgbt=true" : ""}`;
}

export function isAssetPath(pathname) {
    return pathname.startsWith("/_next/static/") || pathname.startsWith("/_next/image") || pathname.startsWith("/media/");
}

const assetKey = (u) => `asset:${u.pathname}${u.pathname.startsWith("/_next/image") ? u.search : ""}`;

const hasSession = (request) => /(?:^|;\s*)clinic_(?:at|rt)=/.test(request.headers.get("cookie") || "");

function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function fallbackPage(pathname) {
    const message = pathname.startsWith("/avaliacao-neuropsicologica") ? AVALIACAO_MESSAGE : DEFAULT_MESSAGE;
    const href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Psicólogo João Fernandes</title>
<style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#faf7f2;color:#2b2b2b}
main{max-width:30rem;padding:2rem 1.25rem;text-align:center}a.b{display:inline-block;margin:1.25rem 0;padding:.9rem 1.6rem;border-radius:.6rem;background:#25d366;color:#06361a;font-weight:600;text-decoration:none}
small{display:block;color:#666;line-height:1.5}</style></head><body><main>
<h1>Psicólogo João Fernandes</h1>
<p>Terapia comportamental online e presencial na Vila Madalena, São Paulo.</p>
<a class="b" href="${escapeHtml(href)}">Falar no WhatsApp</a>
<small>Rua Harmonia, 1323 — Sumarezinho, Vila Madalena, São Paulo - SP<br>CRP 06/157908</small>
</main></body></html>`;
}

const isFailure = (res) => res.status >= 500;

async function fetchOrigin(request, { timeoutMs, body } = {}) {
    const init = { redirect: "manual" };
    if (body !== undefined) init.body = body;
    let timer;
    if (timeoutMs) {
        const ctl = new AbortController();
        timer = setTimeout(() => ctl.abort(), timeoutMs);
        init.signal = ctl.signal;
    }
    try {
        return await fetch(new Request(request, init));
    } finally {
        clearTimeout(timer);
    }
}

async function serveSnapshot(request, env, url) {
    const headers = { "x-edge-fallback": "snapshot", "cache-control": "no-store" };
    const key = pageKey(request.url);
    if (key) {
        const html = await env.SNAPSHOTS.get(key);
        if (html) return new Response(request.method === "HEAD" ? null : html, { status: 200, headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
    }
    if (isAssetPath(url.pathname)) {
        const { value, metadata } = await env.SNAPSHOTS.getWithMetadata(assetKey(url), "arrayBuffer");
        if (value) return new Response(request.method === "HEAD" ? null : value, { status: 200, headers: { ...headers, "content-type": metadata?.type || "application/octet-stream", "cache-control": "public, max-age=300" } });
        return null;
    }
    if ((request.headers.get("accept") || "").includes("text/html")) {
        return new Response(request.method === "HEAD" ? null : fallbackPage(url.pathname), { status: 200, headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
    }
    return null;
}

async function queueLead(env, request, body) {
    const key = `lead:${Date.now()}:${crypto.randomUUID()}`;
    await env.SNAPSHOTS.put(key, JSON.stringify({
        body,
        type: request.headers.get("content-type") || "application/json",
        ua: request.headers.get("user-agent") || "",
    }), { expirationTtl: 14 * 24 * 3600 });
    console.log(`edge-fallback queued lead ${key}`);
    return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { "content-type": "application/json", "x-edge-fallback": "queued" } });
}

export async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    if (url.searchParams.get("edge") === "origin") {
        url.searchParams.delete("edge");
        return fetch(new Request(url, request));
    }

    const isRead = request.method === "GET" || request.method === "HEAD";

    if (request.method === "POST" && url.pathname === "/api/leads") {
        const body = await request.text();
        try {
            const res = await fetchOrigin(request, { body, timeoutMs: PAGE_TIMEOUT_MS });
            if (!isFailure(res)) return res;
            console.log(`edge-fallback path=${url.pathname} status=${res.status}`);
        } catch (err) {
            console.log(`edge-fallback path=${url.pathname} error=${err.message}`);
        }
        return queueLead(env, request, body);
    }

    if (!isRead) return fetch(request);

    const isPage = pageKey(request.url) !== null;
    let res;
    try {
        res = await fetchOrigin(request, { timeoutMs: isPage ? PAGE_TIMEOUT_MS : undefined });
        if (!isFailure(res)) return res;
        console.log(`edge-fallback path=${url.pathname} status=${res.status}`);
    } catch (err) {
        console.log(`edge-fallback path=${url.pathname} error=${err.message}`);
    }
    // Admins see the real error, not a snapshot of the public page.
    if (hasSession(request)) {
        if (res) return res;
        throw new Error("origin unreachable");
    }
    const fallback = await serveSnapshot(request, env, url);
    if (fallback) return fallback;
    if (res) return res;
    return new Response("Service temporarily unavailable", { status: 503 });
}

export function extractAssets(html) {
    const found = new Set();
    for (const m of html.matchAll(/["'(](\/(?:_next\/static\/|_next\/image\?|media\/)[^"'()\s<>]+)/g)) {
        found.add(m[1].replace(/&amp;/g, "&"));
    }
    return [...found].filter((p) => !p.includes("\\"));
}

async function refreshPage(env, path) {
    const url = `https://${HOST}${path}`;
    const key = pageKey(url);
    const { metadata } = await env.SNAPSHOTS.getWithMetadata(key);
    const fresh = metadata?.ts && Date.now() - metadata.ts < PAGE_REFRESH_MS;
    const res = await fetch(url, { headers: { "user-agent": "clinic-edge-snapshot" }, redirect: "manual" });
    if (res.status !== 200 || !(res.headers.get("content-type") || "").includes("text/html")) return;
    const html = await res.text();
    if (!fresh) await env.SNAPSHOTS.put(key, html, { metadata: { ts: Date.now() } });
    for (const asset of extractAssets(html)) {
        const au = new URL(asset, url);
        const k = assetKey(au);
        const { value } = await env.SNAPSHOTS.getWithMetadata(k, "stream");
        if (value) { await value.cancel(); continue; }
        const ar = await fetch(au, { headers: { "user-agent": "clinic-edge-snapshot" } });
        if (ar.status === 200) {
            await env.SNAPSHOTS.put(k, await ar.arrayBuffer(), {
                metadata: { type: ar.headers.get("content-type") || "application/octet-stream" },
                expirationTtl: ASSET_TTL_S,
            });
        }
    }
}

async function replayLeads(env) {
    const { keys } = await env.SNAPSHOTS.list({ prefix: "lead:" });
    for (const { name } of keys) {
        const raw = await env.SNAPSHOTS.get(name);
        if (!raw) continue;
        const lead = JSON.parse(raw);
        try {
            const res = await fetch(`https://${HOST}/api/leads`, {
                method: "POST",
                headers: { "content-type": lead.type, "user-agent": lead.ua },
                body: lead.body,
            });
            if (res.status < 500) await env.SNAPSHOTS.delete(name);
            else return; // origin still down: keep the rest queued
        } catch {
            return;
        }
    }
}

export async function handleScheduled(env) {
    await replayLeads(env);
    for (const path of PAGES) {
        try {
            await refreshPage(env, path);
        } catch (err) {
            console.log(`edge-snapshot ${path} failed: ${err.message}`);
        }
    }
}

export default {
    fetch(request, env, ctx) {
        ctx.passThroughOnException();
        return handleRequest(request, env, ctx);
    },
    scheduled(_event, env, ctx) {
        ctx.waitUntil(handleScheduled(env));
    },
};
