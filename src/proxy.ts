import { NextResponse, type NextRequest } from 'next/server'

// Serves the Markdown twin of a page when an agent asks for it, either with a
// ".md" suffix or with "Accept: text/markdown" (preferred over text/html).
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (pathname.endsWith('.md')) {
        const page = pathname.slice(0, -3).replace(/^\/index$/, '')
        return NextResponse.rewrite(new URL(`/markdown${page}`, request.url))
    }

    const accept = request.headers.get('accept') ?? ''
    const md = accept.indexOf('text/markdown')
    const html = accept.indexOf('text/html')
    if (md !== -1 && (html === -1 || md < html)) {
        return NextResponse.rewrite(new URL(`/markdown${pathname === '/' ? '' : pathname}`, request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next|api|admin|edit|auth|ingest|internal|media|markdown|.*\\.(?!md$)[a-zA-Z0-9]+$).*)'],
}
