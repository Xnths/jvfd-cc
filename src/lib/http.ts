// Shared edge-cache policy for public, CMS-backed text endpoints. Data is
// already cached server-side; this lets Cloudflare and crawlers cache too.
export const publicCacheHeaders = {
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
} as const
