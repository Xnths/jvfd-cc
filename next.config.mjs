import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    productionBrowserSourceMaps: true,
    images: {
        formats: ['image/avif', 'image/webp'],
    },
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
                    https://secure.gravatar.com;
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

        return [
            {
                source: '/admin/:path*',
                headers: [...commonHeaders, adminCSP],
            },
            {
                source: '/((?!admin).*)',
                headers: [...commonHeaders, publicCSP],
            },
        ]
    },

};

export default withPayload(nextConfig);
