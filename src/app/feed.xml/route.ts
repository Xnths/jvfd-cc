import { SITE_URL, contact, person } from '@/content/clinic'
import { getPublishedPosts } from '@/lib/queries'
import { publicCacheHeaders } from '@/lib/http'

export const dynamic = 'force-dynamic'

function escapeXml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

export async function GET() {
    const posts = await getPublishedPosts().catch(() => [])

    const items = posts
        .map((post) => {
            const url = `${SITE_URL}/blog/${post.slug}`
            return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt ?? '')}</description>
      <pubDate>${new Date(post.publishedDate).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(post.author || person.name)}</dc:creator>
    </item>`
        })
        .join('')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Blog do Psicólogo João Fernandes</title>
    <link>${SITE_URL}/blog</link>
    <description>Artigos sobre psicologia, Análise do Comportamento e saúde mental, por ${escapeXml(person.name)} (CRP ${person.crp}).</description>
    <language>pt-BR</language>
    <managingEditor>${contact.email} (${escapeXml(person.name)})</managingEditor>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${posts[0] ? `<lastBuildDate>${new Date(posts[0].updatedAt).toUTCString()}</lastBuildDate>` : ''}${items}
  </channel>
</rss>`

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            ...publicCacheHeaders,
        },
    })
}
