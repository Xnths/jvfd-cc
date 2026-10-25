import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getPayload, type Where } from "payload";
import configPromise from "@payload-config";
import { CACHE_TAGS } from "./cache-tags";
import { ApiNotFound, apiGet, contentFromApi } from "./api";

export { CACHE_TAGS };

// Cached read layer for public pages. Every query is tagged so the Payload
// hooks in src/hooks/revalidate.ts can invalidate it the moment content
// changes — pages stay fast without serving stale content.

// Long safety net; real freshness comes from tag invalidation.
const REVALIDATE_SECONDS = 60 * 60 * 24;

export type MediaDoc = {
    url?: string | null;
    alt?: string | null;
    width?: number | null;
    height?: number | null;
};

export type PostDoc = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    keywords?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: any;
    publishedDate: string;
    updatedAt: string;
    createdAt: string;
    author?: string | null;
    image?: MediaDoc | string | null;
    status?: "draft" | "published" | null;
};

export type TreatmentDoc = {
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: any;
    metaTitle?: string | null;
    metaDescription?: string | null;
    updatedAt: string;
    createdAt: string;
};

export type CommentView = {
    id: string;
    body: string;
    createdAt: string;
    authorName: string;
};

// Posts created before the `status` field existed have no value at all;
// `not_equals` (Mongo $ne) keeps them visible while hiding real drafts.
const publishedWhere: Where = { status: { not_equals: "draft" } };

async function payloadClient() {
    return getPayload({ config: configPromise });
}

export const getPublishedPosts = cache(
    unstable_cache(
        async (): Promise<PostDoc[]> => {
            if (contentFromApi()) {
                return (await apiGet<{ posts: PostDoc[] }>("/api/v1/public/posts?content=1")).posts;
            }
            const payload = await payloadClient();
            const result = await payload.find({
                collection: "posts",
                where: publishedWhere,
                sort: "-publishedDate",
                limit: 1000,
                depth: 1,
            });
            return result.docs as unknown as PostDoc[];
        },
        ["published-posts"],
        { tags: [CACHE_TAGS.posts], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getPostBySlug = cache(
    unstable_cache(
        async (slug: string): Promise<PostDoc | null> => {
            if (contentFromApi()) {
                try {
                    return await apiGet<PostDoc>(`/api/v1/public/posts/${encodeURIComponent(slug)}`);
                } catch (e) {
                    if (e instanceof ApiNotFound) return null;
                    throw e;
                }
            }
            const payload = await payloadClient();
            const result = await payload.find({
                collection: "posts",
                where: { and: [{ slug: { equals: slug } }, publishedWhere] },
                limit: 1,
                depth: 1,
            });
            return (result.docs[0] as unknown as PostDoc) ?? null;
        },
        ["post-by-slug"],
        { tags: [CACHE_TAGS.posts], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getTreatments = cache(
    unstable_cache(
        async (): Promise<TreatmentDoc[]> => {
            const payload = await payloadClient();
            const result = await payload.find({
                collection: "treatments",
                limit: 100,
                depth: 1,
            });
            return result.docs as unknown as TreatmentDoc[];
        },
        ["treatments"],
        { tags: [CACHE_TAGS.treatments], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getTreatmentBySlug = cache(
    unstable_cache(
        async (slug: string): Promise<TreatmentDoc | null> => {
            const payload = await payloadClient();
            const result = await payload.find({
                collection: "treatments",
                where: { slug: { equals: slug } },
                limit: 1,
                depth: 1,
            });
            return (result.docs[0] as unknown as TreatmentDoc) ?? null;
        },
        ["treatment-by-slug"],
        { tags: [CACHE_TAGS.treatments], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getApprovedComments = cache(
    unstable_cache(
        async (postId: string): Promise<CommentView[]> => {
            if (contentFromApi()) {
                return (await apiGet<{ comments: CommentView[] }>(`/api/v1/public/posts/${encodeURIComponent(postId)}/comments`)).comments;
            }
            const payload = await payloadClient();
            const { docs } = await payload.find({
                collection: "comments",
                where: {
                    and: [
                        { post: { equals: postId } },
                        { status: { equals: "approved" } },
                    ],
                },
                sort: "createdAt",
                limit: 100,
                depth: 1,
            });
            return docs.map((c) => ({
                id: c.id as string,
                body: c.body as string,
                createdAt: c.createdAt as string,
                authorName:
                    typeof c.author === "object" && c.author
                        ? ((c.author as { name?: string }).name ?? "Anônimo")
                        : "Anônimo",
            }));
        },
        ["approved-comments"],
        { tags: [CACHE_TAGS.comments], revalidate: REVALIDATE_SECONDS },
    ),
);

export function getMedia(image: PostDoc["image"]): MediaDoc | null {
    return image && typeof image === "object" && image.url ? image : null;
}
