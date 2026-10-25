// Kept apart from queries.ts so Payload hooks can import the tags without
// pulling in @payload-config (which would be a circular import).
export const CACHE_TAGS = {
    posts: "posts",
    treatments: "treatments",
    comments: "comments",
} as const;
