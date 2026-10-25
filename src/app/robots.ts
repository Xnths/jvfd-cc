import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/content/clinic'

const PRIVATE_PATHS = ['/admin', '/api', '/conta', '/login', '/registro', '/markdown']

// AI crawlers and answer engines, listed explicitly so the intent is
// unambiguous: the clinic wants to be found and cited by them.
// LLM-friendly summaries live at /llms.txt and /llms-full.txt.
const AI_AGENTS = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'anthropic-ai',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'GoogleOther',
    'Applebot',
    'Applebot-Extended',
    'Bingbot',
    'DuckAssistBot',
    'Meta-ExternalAgent',
    'Meta-ExternalFetcher',
    'MistralAI-User',
    'CCBot',
    'cohere-ai',
    'Amazonbot',
]

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: PRIVATE_PATHS,
            },
            {
                userAgent: AI_AGENTS,
                allow: ['/', '/llms.txt', '/llms-full.txt'],
                disallow: PRIVATE_PATHS,
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    }
}
