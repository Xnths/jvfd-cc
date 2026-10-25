/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    productionBrowserSourceMaps: true,
    images: {
        formats: ['image/avif', 'image/webp'],
        // Optimized images rarely change; cache them for 30 days.
        minimumCacheTTL: 60 * 60 * 24 * 30,
    },
    // OG cards read fonts and the portrait from disk at request time.
    outputFileTracingIncludes: {
        '/**/opengraph-image*': ['./src/assets/fonts/**/*', './public/jv.jpeg'],
    },
    // Blog accounts were retired when the site moved to Google-only admin sign-in.
    async redirects() {
        return [
            { source: '/login', destination: '/blog', permanent: true },
            { source: '/registro', destination: '/blog', permanent: true },
            { source: '/conta', destination: '/blog', permanent: true },
        ]
    },
    async rewrites() {
        return [
            {
                source: '/ingest/static/:path*',
                destination: 'https://us-assets.i.posthog.com/static/:path*',
            },
            {
                source: '/ingest/:path*',
                destination: 'https://us.i.posthog.com/:path*',
            },
        ]
    },
    // Required to support PostHog trailing slash API requests
    skipTrailingSlashRedirect: true,
    async headers() {
        const commonHeaders = [
            {
                key: 'Strict-Transport-Security',
                value: 'max-age=63072000; includeSubDomains; preload',
            },
            {
                key: 'X-Content-Type-Options',
                value: 'nosniff',
            },
            {
                key: 'X-Frame-Options',
                value: 'SAMEORIGIN',
            },
            {
                key: 'Referrer-Policy',
                value: 'origin-when-cross-origin',
            },
            {
                key: 'Permissions-Policy',
                value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
            },
            {
                key: 'Cross-Origin-Opener-Policy',
                value: 'same-origin',
            },
        ]

        const publicCSP = {
            key: 'Content-Security-Policy',
            value: `
                default-src 'self';
                script-src 'self' 'unsafe-inline' 'unsafe-eval'
                    https://www.googletagmanager.com
                    https://www.google-analytics.com
                    https://maps.googleapis.com
                    https://static.cloudflareinsights.com;
                style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                img-src 'self' data:
                    https://www.google-analytics.com
                    https://www.googletagmanager.com
                    https://maps.gstatic.com
                    https://maps.googleapis.com;
                font-src 'self' https://fonts.gstatic.com;
                connect-src 'self'
                    https://www.google-analytics.com
                    https://analytics.google.com
                    https://region1.analytics.google.com
                    https://maps.googleapis.com
                    https://api.whatsapp.com
                    https://cloudflareinsights.com;
                frame-src 'self' https://www.google.com;
                object-src 'none';
                base-uri 'self';
                form-action 'self';
                frame-ancestors 'none';
                upgrade-insecure-requests;
            `.replace(/\s{2,}/g, ' ').trim(),
        }

        // Admin panel: same as public but also allows Gravatar avatars
        const adminCSP = {
            key: 'Content-Security-Policy',
            value: `
                default-src 'self';
                script-src 'self' 'unsafe-inline' 'unsafe-eval'
                    https://www.googletagmanager.com
                    https://www.google-analytics.com
                    https://maps.googleapis.com
                    https://static.cloudflareinsights.com;
                style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                img-src 'self' data:
                    https://www.google-analytics.com
                    https://www.googletagmanager.com
                    https://maps.gstatic.com
                    https://maps.googleapis.com
                    https://www.gravatar.com
                    https://secure.gravatar.com
                    https://lh3.googleusercontent.com;
                font-src 'self' https://fonts.gstatic.com;
                connect-src 'self'
                    https://www.google-analytics.com
                    https://analytics.google.com
                    https://region1.analytics.google.com
                    https://maps.googleapis.com
                    https://api.whatsapp.com
                    https://cloudflareinsights.com;
                frame-src 'self' https://www.google.com;
                object-src 'none';
                base-uri 'self';
                form-action 'self';
                frame-ancestors 'none';
                upgrade-insecure-requests;
            `.replace(/\s{2,}/g, ' ').trim(),
        }

        const staticAssetCache = {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
        }

        return [
            {
                source: '/:file(.*\\.(?:jpg|jpeg|png|webp|avif|svg|ico|woff2))',
                headers: [staticAssetCache],
            },
            {
                source: '/:area(admin)/:path*',
                headers: [...commonHeaders, adminCSP],
            },
            {
                source: '/((?!admin).*)',
                headers: [...commonHeaders, publicCSP],
            },
        ]
    },

};

export default nextConfig;
