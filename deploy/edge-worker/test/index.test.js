import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handleRequest, handleScheduled, extractAssets, pageKey } from "../src/index.js";

class FakeKV {
    store = new Map();
    async get(k, type) {
        const e = this.store.get(k);
        if (!e) return null;
        return type === "arrayBuffer" ? e.value : e.value;
    }
    async getWithMetadata(k, type) {
        const e = this.store.get(k);
        if (!e) return { value: null, metadata: null };
        if (type === "stream") return { value: { cancel: async () => {} }, metadata: e.metadata };
        return { value: e.value, metadata: e.metadata ?? null };
    }
    async put(k, value, opts = {}) { this.store.set(k, { value, metadata: opts.metadata }); }
    async delete(k) { this.store.delete(k); }
    async list({ prefix }) { return { keys: [...this.store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }; }
}

const realFetch = globalThis.fetch;
let env, calls, origin;
const ctx = { waitUntil() {}, passThroughOnException() {} };

beforeEach(() => {
    env = { SNAPSHOTS: new FakeKV() };
    calls = [];
    origin = () => new Response("ok", { status: 200, headers: { "content-type": "text/html" } });
    globalThis.fetch = async (input, init) => {
        const req = input instanceof Request ? input : new Request(input, init);
        calls.push(`${req.method} ${req.url}`);
        return origin(req);
    };
});
globalThis.addEventListener?.("unload", () => { globalThis.fetch = realFetch; });

const get = (path, headers = {}) => new Request(`https://psicologojoaofernandes.com${path}`, { headers: { accept: "text/html", ...headers } });

test("passes healthy responses through untouched", async () => {
    const res = await handleRequest(get("/"), env, ctx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-edge-fallback"), null);
});

test("pageKey keeps only the lgbt variant and ignores tracking params", () => {
    assert.equal(pageKey("https://x.com/?gclid=1&utm_source=a"), "page:/");
    assert.equal(pageKey("https://x.com/?lgbt=true&gclid=1"), "page:/?lgbt=true");
    assert.equal(pageKey("https://x.com/avaliacao-neuropsicologica/"), "page:/avaliacao-neuropsicologica");
    assert.equal(pageKey("https://x.com/blog"), null);
});

test("530 from the origin serves the stored snapshot", async () => {
    await env.SNAPSHOTS.put("page:/", "<html>snapshot</html>", { metadata: { ts: Date.now() } });
    origin = () => new Response("tunnel", { status: 530 });
    const res = await handleRequest(get("/?gclid=abc"), env, ctx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-edge-fallback"), "snapshot");
    assert.equal(await res.text(), "<html>snapshot</html>");
});

test("a thrown fetch also falls back, and an unknown page gets the WhatsApp page", async () => {
    origin = () => { throw new Error("connection refused"); };
    const res = await handleRequest(get("/avaliacao-neuropsicologica"), env, ctx);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /wa\.me\/5511955591996\?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20a%20avalia%C3%A7%C3%A3o%20neuropsicol%C3%B3gica\./);
    assert.match(html, /CRP 06\/157908/);
});

test("sessions see the real error instead of a snapshot", async () => {
    await env.SNAPSHOTS.put("page:/", "<html>snapshot</html>");
    origin = () => new Response("down", { status: 502 });
    const res = await handleRequest(get("/", { cookie: "clinic_at=abc" }), env, ctx);
    assert.equal(res.status, 502);
});

test("?edge=origin bypasses the fallback", async () => {
    await env.SNAPSHOTS.put("page:/", "<html>snapshot</html>");
    origin = () => new Response("tunnel", { status: 530 });
    const res = await handleRequest(get("/?edge=origin"), env, ctx);
    assert.equal(res.status, 530);
    assert.ok(!calls.at(-1).includes("edge=origin"));
});

test("stored assets are served when the origin is down", async () => {
    await env.SNAPSHOTS.put("asset:/_next/static/a.css", new TextEncoder().encode("body{}").buffer, { metadata: { type: "text/css" } });
    origin = () => new Response("x", { status: 530 });
    const res = await handleRequest(get("/_next/static/a.css", { accept: "text/css" }), env, ctx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/css");
});

test("non-HTML API reads keep the origin error", async () => {
    origin = () => new Response("x", { status: 502 });
    const res = await handleRequest(get("/api/v1/posts", { accept: "application/json" }), env, ctx);
    assert.equal(res.status, 502);
});

test("leads are queued while the origin is down and replayed afterwards", async () => {
    origin = () => new Response("x", { status: 530 });
    const req = new Request("https://psicologojoaofernandes.com/api/leads", {
        method: "POST", body: '{"gclid":"g1"}', headers: { "content-type": "application/json" },
    });
    const res = await handleRequest(req, env, ctx);
    assert.equal(res.status, 202);
    assert.equal([...env.SNAPSHOTS.store.keys()].filter((k) => k.startsWith("lead:")).length, 1);

    // still down: cron keeps it
    await handleScheduled(env);
    assert.equal([...env.SNAPSHOTS.store.keys()].filter((k) => k.startsWith("lead:")).length, 1);

    // back up: replayed with the original body, then removed
    origin = (r) => r.method === "POST" ? new Response("{}", { status: 200 }) : new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } });
    await handleScheduled(env);
    assert.equal([...env.SNAPSHOTS.store.keys()].filter((k) => k.startsWith("lead:")).length, 0);
    assert.ok(calls.some((c) => c.startsWith("POST") && c.endsWith("/api/leads")));
});

test("cron stores pages and their assets, and throttles page rewrites", async () => {
    const html = '<link href="/_next/static/css/a.css"><img src="/_next/image?url=%2Fmedia%2Fx.png&amp;w=640&amp;q=75"><a href="/blog">';
    origin = (r) => new URL(r.url).pathname === "/" || new URL(r.url).pathname.startsWith("/avaliacao")
        ? new Response(html, { status: 200, headers: { "content-type": "text/html" } })
        : new Response("asset", { status: 200, headers: { "content-type": "text/css" } });
    await handleScheduled(env);
    assert.ok(env.SNAPSHOTS.store.has("page:/"));
    assert.ok(env.SNAPSHOTS.store.has("page:/?lgbt=true"));
    assert.ok(env.SNAPSHOTS.store.has("asset:/_next/static/css/a.css"));
    assert.ok(env.SNAPSHOTS.store.has("asset:/_next/image?url=%2Fmedia%2Fx.png&w=640&q=75"));
    const ts = env.SNAPSHOTS.store.get("page:/").metadata.ts;
    await handleScheduled(env);
    assert.equal(env.SNAPSHOTS.store.get("page:/").metadata.ts, ts);
});

test("cron never overwrites a snapshot with an error page", async () => {
    await env.SNAPSHOTS.put("page:/", "good", { metadata: { ts: 0 } });
    origin = () => new Response("bad", { status: 530, headers: { "content-type": "text/html" } });
    await handleScheduled(env);
    assert.equal(env.SNAPSHOTS.store.get("page:/").value, "good");
});

test("extractAssets decodes &amp; and ignores other links", () => {
    assert.deepEqual(extractAssets('<a href="/blog"><img src="/_next/image?url=a&amp;w=1">'), ["/_next/image?url=a&w=1"]);
});
