import type { Metadata } from "next";
import { SITE_URL, person } from "@/content/clinic";

export const SITE_NAME = "Psicólogo João Fernandes";

type BuildMetadataInput = {
    /** Page title; goes through the layout template unless `absoluteTitle` is set */
    title?: string;
    absoluteTitle?: string;
    description?: string;
    /** Path starting with "/", used for canonical, og:url and the markdown alternate */
    path: string;
    type?: "website" | "article" | "profile";
    image?: { url: string; width?: number; height?: number; alt?: string } | null;
    publishedTime?: string;
    modifiedTime?: string;
    keywords?: string[];
    /** Whether a markdown version exists at `${path}.md` */
    markdown?: boolean;
    noindex?: boolean;
};

const DEFAULT_IMAGE = {
    url: "/og",
    width: 1200,
    height: 630,
    alt: "Psicólogo João Fernandes — Análise do Comportamento, online e presencial na Vila Madalena, SP",
};

export function absoluteUrl(path: string) {
    return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

export function markdownPath(path: string) {
    return path === "/" ? "/index.md" : `${path}.md`;
}

// Next.js replaces (rather than merges) `openGraph` and `twitter` objects
// between segments, so every page emits the complete set from here.
export function buildMetadata({
    title,
    absoluteTitle,
    description,
    path,
    type = "website",
    image,
    publishedTime,
    modifiedTime,
    keywords,
    markdown = true,
    noindex = false,
}: BuildMetadataInput): Metadata {
    const ogTitle = absoluteTitle ?? (title ? `${title} | ${SITE_NAME}` : SITE_NAME);

    return {
        title: absoluteTitle ? { absolute: absoluteTitle } : title,
        description,
        keywords,
        alternates: {
            canonical: path,
            ...(markdown ? { types: { "text/markdown": markdownPath(path) } } : {}),
        },
        openGraph: {
            type,
            locale: "pt_BR",
            siteName: SITE_NAME,
            url: path,
            title: ogTitle,
            description,
            images: [image ?? DEFAULT_IMAGE],
            ...(type === "article"
                ? {
                      publishedTime,
                      modifiedTime,
                      authors: [person.name],
                  }
                : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: ogTitle,
            description,
            images: [(image ?? DEFAULT_IMAGE).url],
        },
        ...(noindex ? { robots: { index: false, follow: true } } : {}),
    };
}
