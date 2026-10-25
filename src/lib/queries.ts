import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";
import { ApiNotFound, apiGet } from "./api";

export { CACHE_TAGS };

// Cached read layer for public pages. Every query is tagged so the Go API can invalidate it
// (POST /internal/revalidate) the moment content changes: pages stay fast without serving stale content.
// Without API_INTERNAL_URL (the Docker build, local dev) every read fails and pages fall back to code defaults.

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

/** Service settings that live in Postgres (layout, theme, card copy…). Only present when CONTENT_SOURCE=api. */
export type ServiceInfo = {
    id: string;
    slug: string;
    name: string;
    cardTitle: string;
    cardDescription: string;
    icon: string;
    category: "therapy" | "education";
    layout: string;
    theme: string;
    badge: string;
    ctaText: string;
    whatsappMessage: string;
    showOnHome: "always" | "campaign" | "never";
    campaignKey: string | null;
    showInFooter: boolean;
    showContactSection: boolean;
    sortOrder: number;
    analyticsKey: string;
};

/** A service as shown in the home grid and the footer. */
export type ServiceCard = { href: string; name: string; title: string; description: string; icon?: string; pride?: boolean; showOnHome: "always" | "campaign" | "never"; inFooter: boolean };

export type TreatmentDoc = {
    service?: ServiceInfo;
    pageId?: string;
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

type PageApi = {
    id: string;
    slug: string;
    kind: string;
    title: string;
    subtitle: string;
    metaTitle: string;
    metaDescription: string;
    updatedAt: string;
    service?: ServiceInfo & { body: unknown; createdAt: string };
};

function treatmentFromPage(p: PageApi): TreatmentDoc | null {
    if (!p.service) return null;
    const { body, createdAt, ...info } = p.service;
    return {
        id: p.id, pageId: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle || null, content: body,
        metaTitle: p.metaTitle || null, metaDescription: p.metaDescription || null, updatedAt: p.updatedAt, createdAt, service: info,
    };
}

export const getPublishedPosts = cache(
    unstable_cache(
        async (): Promise<PostDoc[]> => (await apiGet<{ posts: PostDoc[] }>("/api/v1/public/posts?content=1")).posts,
        ["published-posts"],
        { tags: [CACHE_TAGS.posts], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getPostBySlug = cache(
    unstable_cache(
        async (slug: string): Promise<PostDoc | null> => {
            try {
                return await apiGet<PostDoc>(`/api/v1/public/posts/${encodeURIComponent(slug)}`);
            } catch (e) {
                if (e instanceof ApiNotFound) return null;
                throw e;
            }
        },
        ["post-by-slug"],
        { tags: [CACHE_TAGS.posts], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getTreatments = cache(
    unstable_cache(
        async (): Promise<TreatmentDoc[]> => {
            const list = (await apiGet<{ services: ServiceInfo[] }>("/api/v1/public/services")).services;
            const pages = await Promise.all(list.map((sv) => apiGet<PageApi>(`/api/v1/public/pages/${encodeURIComponent(sv.slug)}`).catch(() => null)));
            return pages.flatMap((p) => (p ? [treatmentFromPage(p)].filter((t): t is TreatmentDoc => !!t) : []));
        },
        ["treatments"],
        { tags: [CACHE_TAGS.treatments, "services", "pages"], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getTreatmentBySlug = cache(
    unstable_cache(
        async (slug: string): Promise<TreatmentDoc | null> => {
            try {
                return treatmentFromPage(await apiGet<PageApi>(`/api/v1/public/pages/${encodeURIComponent(slug)}`));
            } catch (e) {
                if (e instanceof ApiNotFound) return null;
                throw e;
            }
        },
        ["treatment-by-slug"],
        { tags: [CACHE_TAGS.treatments, "services", "pages"], revalidate: REVALIDATE_SECONDS },
    ),
);

/** Cards for the home grid and the footer; null when the API is unreachable (the copy in code shows instead). */
export const getServiceCards = cache(
    unstable_cache(
        async (): Promise<ServiceCard[] | null> => {
            const list = (await apiGet<{ services: ServiceInfo[] }>("/api/v1/public/services")).services;
            return list.map((sv) => ({
                href: `/${sv.slug}`, name: sv.name, title: sv.cardTitle, description: sv.cardDescription, icon: sv.icon,
                pride: sv.campaignKey === "lgbt", showOnHome: sv.showOnHome, inFooter: sv.showInFooter,
            }));
        },
        ["service-cards"],
        { tags: ["services"], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getApprovedComments = cache(
    unstable_cache(
        async (postId: string): Promise<CommentView[]> =>
            (await apiGet<{ comments: CommentView[] }>(`/api/v1/public/posts/${encodeURIComponent(postId)}/comments`)).comments,
        ["approved-comments"],
        { tags: [CACHE_TAGS.comments], revalidate: REVALIDATE_SECONDS },
    ),
);

export function getMedia(image: PostDoc["image"]): MediaDoc | null {
    return image && typeof image === "object" && image.url ? image : null;
}

// ── Profiles, glossary, answered questions ─────────────────────────────────

export type ProfileEntry = {
    id: string;
    title: string;
    organization: string;
    location: string;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent: boolean;
    description: string;
    url: string;
    credentialId: string;
    icon: string;
    featured: boolean;
};
export type ProfileSection = { id: string; kind: string; title: string; entries: ProfileEntry[] };
export type ProfileDoc = {
    id: string;
    slug: string;
    displayName: string;
    fullName: string;
    jobTitle: string;
    crp?: string | null;
    isClinician: boolean;
    practicingSince?: number | null;
    approach: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bio: any;
    photo?: MediaDoc | null;
    knowsAbout: string[];
    languages: string[];
    alumniOf: string[];
    links: Record<string, string>;
    isPrimary: boolean;
    sections?: ProfileSection[];
    updatedAt?: string;
};

export type GlossaryItem = { slug: string; term: string; altNames: string[]; shortDefinition: string; updatedAt: string };
export type GlossaryTerm = GlossaryItem & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sources: any;
    reviewedBy?: { name: string; slug: string; crp?: string | null };
};

export type AnsweredQuestion = {
    id: string;
    slug: string | null;
    question: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    answer: any;
    topic: string;
    publishedAt: string | null;
};

export const getProfiles = cache(
    unstable_cache(
        async (): Promise<ProfileDoc[]> => (await apiGet<{ profiles: ProfileDoc[] }>("/api/v1/public/profiles")).profiles,
        ["profiles"],
        { tags: ["profiles"], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getProfileBySlug = cache(
    unstable_cache(
        async (slug: string): Promise<ProfileDoc | null> => {
            try {
                return await apiGet<ProfileDoc>(`/api/v1/public/profiles/${encodeURIComponent(slug)}`);
            } catch (e) {
                if (e instanceof ApiNotFound) return null;
                throw e;
            }
        },
        ["profile-by-slug"],
        { tags: ["profiles"], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getGlossary = cache(
    unstable_cache(
        async (): Promise<GlossaryItem[]> => (await apiGet<{ terms: GlossaryItem[] }>("/api/v1/public/glossary")).terms,
        ["glossary"],
        { tags: ["glossary"], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getGlossaryTerm = cache(
    unstable_cache(
        async (slug: string): Promise<GlossaryTerm | null> => {
            try {
                return await apiGet<GlossaryTerm>(`/api/v1/public/glossary/${encodeURIComponent(slug)}`);
            } catch (e) {
                if (e instanceof ApiNotFound) return null;
                throw e;
            }
        },
        ["glossary-term"],
        { tags: ["glossary"], revalidate: REVALIDATE_SECONDS },
    ),
);

export const getAnsweredQuestions = cache(
    unstable_cache(
        async (): Promise<AnsweredQuestion[]> => (await apiGet<{ questions: AnsweredQuestion[] }>("/api/v1/public/faq")).questions,
        ["answered-questions"],
        { tags: ["faq"], revalidate: REVALIDATE_SECONDS },
    ),
);

export type RouteInfo = { path: string; kind: string; title: string; description: string; updatedAt: string };

/** Every public URL the Go API knows about (used for the sitemap and llms.txt). */
export const getRoutes = cache(
    unstable_cache(
        async (): Promise<RouteInfo[]> => (await apiGet<{ routes: RouteInfo[] }>("/api/v1/public/routes")).routes,
        ["routes"],
        { tags: ["pages", "services", "posts", "glossary", "faq", "profiles"], revalidate: REVALIDATE_SECONDS },
    ),
);
