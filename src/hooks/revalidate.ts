import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '../lib/cache-tags'
import { pingIndexNow } from '../lib/indexnow'

type Tag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

// Pages that aggregate content from every collection.
const SHARED_PATHS = ['/', '/blog', '/sitemap.xml', '/feed.xml', '/llms.txt', '/llms-full.txt']

function invalidate(tag: Tag, paths: string[]) {
    // These hooks also run from Payload CLI scripts, outside the Next.js
    // runtime, where revalidation APIs throw. Content still saves.
    try {
        revalidateTag(tag, { expire: 0 })
        for (const path of new Set([...paths, ...SHARED_PATHS])) revalidatePath(path)
    } catch {
        // not running inside Next.js
    }
}

function pathsFor(prefix: string, ...slugs: (string | undefined | null)[]) {
    return slugs.filter((s): s is string => !!s).map((s) => `${prefix}/${s}`)
}

export const revalidatePostAfterChange: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
    invalidate(CACHE_TAGS.posts, pathsFor('/blog', doc.slug, previousDoc?.slug))
    if (doc.status === 'published') pingIndexNow([`/blog/${doc.slug}`, '/blog'])
    return doc
}

export const revalidatePostAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
    invalidate(CACHE_TAGS.posts, pathsFor('/blog', doc.slug))
    return doc
}

export const revalidateTreatmentAfterChange: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
    invalidate(CACHE_TAGS.treatments, pathsFor('', doc.slug, previousDoc?.slug))
    pingIndexNow([`/${doc.slug}`])
    return doc
}

export const revalidateTreatmentAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
    invalidate(CACHE_TAGS.treatments, pathsFor('', doc.slug))
    return doc
}

// Comments only render on their post page and the post slug isn't on the
// comment doc, so rely on the tag (which also purges ISR pages that read it).
function invalidateComments() {
    try {
        revalidateTag(CACHE_TAGS.comments, { expire: 0 })
    } catch {
        // not running inside Next.js
    }
}

export const revalidateCommentAfterChange: CollectionAfterChangeHook = ({ doc }) => {
    invalidateComments()
    return doc
}

export const revalidateCommentAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
    invalidateComments()
    return doc
}
