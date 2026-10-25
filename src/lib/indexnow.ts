import { SITE_URL } from "../content/clinic";

// IndexNow notifies Bing (which powers ChatGPT search and Copilot), Yandex,
// Seznam and others the moment a URL changes. The key is public by design and
// is served from public/<key>.txt.
export const INDEXNOW_KEY = "1b5d39d5c1fefacf422a3f81c04deec5";

export function pingIndexNow(paths: string[]) {
    if (process.env.NODE_ENV !== "production" || paths.length === 0) return;

    const body = JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: paths.map((p) => `${SITE_URL}${p}`),
    });

    // Fire-and-forget: never block a CMS save on a third-party API.
    void fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
    }).catch((err) => console.warn("[indexnow] ping failed", err));
}
