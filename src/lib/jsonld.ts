import {
    SITE_URL,
    alumniOf,
    contact,
    faq,
    links,
    person,
    sameAs,
    services,
} from "@/content/clinic";
import { tutoring } from "@/content/tutoring";
import { absoluteUrl } from "@/lib/seo";

// Stable @ids let every page reference the same entities instead of
// redeclaring them, which is how search engines and LLMs merge facts.
export const IDS = {
    website: `${SITE_URL}/#website`,
    person: `${SITE_URL}/#joao`,
    clinic: `${SITE_URL}/#consultorio`,
} as const;

type Node = Record<string, unknown>;

export function graph(...nodes: Node[]) {
    return { "@context": "https://schema.org", "@graph": nodes };
}

const postalAddress = {
    "@type": "PostalAddress",
    streetAddress: contact.address.street,
    addressLocality: contact.address.locality,
    addressRegion: contact.address.region,
    postalCode: contact.address.postalCode,
    addressCountry: contact.address.country,
};

export function websiteNode(): Node {
    return {
        "@type": "WebSite",
        "@id": IDS.website,
        url: SITE_URL,
        name: "Psicólogo João Fernandes",
        inLanguage: "pt-BR",
        publisher: { "@id": IDS.person },
    };
}

export function personNode(): Node {
    return {
        "@type": "Person",
        "@id": IDS.person,
        name: person.name,
        alternateName: person.shortName,
        jobTitle: person.jobTitle,
        description: `Psicólogo clínico (CRP ${person.crp}) com atuação em ${person.approach} desde ${person.practicingSince}. Atende online para todo o Brasil e presencialmente na Vila Madalena, São Paulo.`,
        url: SITE_URL,
        image: person.image,
        email: `mailto:${contact.email}`,
        telephone: contact.phone,
        worksFor: { "@id": IDS.clinic },
        alumniOf: alumniOf.map((name) => ({ "@type": "CollegeOrUniversity", name })),
        hasCredential: {
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "Registro profissional",
            name: `CRP ${person.crp}`,
            recognizedBy: {
                "@type": "Organization",
                name: "Conselho Regional de Psicologia da 6ª Região (CRP-06)",
                url: "https://www.crpsp.org/",
            },
        },
        knowsAbout: person.knowsAbout,
        knowsLanguage: person.languages,
        sameAs,
    };
}

export function clinicNode(): Node {
    return {
        "@type": "Psychologist",
        "@id": IDS.clinic,
        name: "Consultório de Psicologia João Fernandes",
        url: SITE_URL,
        image: person.image,
        logo: `${SITE_URL}/main.jpeg`,
        telephone: contact.phone,
        email: contact.email,
        priceRange: "$$$",
        currenciesAccepted: "BRL",
        address: postalAddress,
        geo: {
            "@type": "GeoCoordinates",
            latitude: contact.geo.latitude,
            longitude: contact.geo.longitude,
        },
        hasMap: links.googleProfile,
        openingHoursSpecification: [
            {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: contact.hours.days,
                opens: contact.hours.opens,
                closes: contact.hours.closes,
            },
        ],
        areaServed: [
            { "@type": "City", name: "São Paulo" },
            { "@type": "Country", name: "Brasil" },
        ],
        founder: { "@id": IDS.person },
        employee: { "@id": IDS.person },
        knowsLanguage: "pt-BR",
        availableService: [
            ...services.map((s) => ({
                "@type": "MedicalTherapy",
                name: s.name,
                description: s.description,
                url: absoluteUrl(s.href),
            })),
        ],
        makesOffer: {
            "@type": "Offer",
            itemOffered: { "@id": `${absoluteUrl(tutoring.path)}#servico` },
        },
        sameAs,
    };
}

export function faqNode(items: { question: string; answer: string }[] = faq): Node {
    return {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
    };
}

export function breadcrumbNode(trail: { name: string; path: string }[]): Node {
    return {
        "@type": "BreadcrumbList",
        itemListElement: [{ name: "Início", path: "/" }, ...trail].map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.path),
        })),
    };
}

export function webPageNode({
    path,
    name,
    description,
    type = "WebPage",
}: {
    path: string;
    name: string;
    description?: string | null;
    type?: string;
}): Node {
    return {
        "@type": type,
        "@id": `${absoluteUrl(path)}#webpage`,
        url: absoluteUrl(path),
        name,
        description: description ?? undefined,
        inLanguage: "pt-BR",
        isPartOf: { "@id": IDS.website },
        about: { "@id": IDS.clinic },
    };
}

export function blogPostingNode(post: {
    slug: string;
    title: string;
    excerpt: string;
    publishedDate: string;
    updatedAt: string;
    keywords?: string | null;
    imageUrl?: string | null;
}): Node {
    const url = absoluteUrl(`/blog/${post.slug}`);
    return {
        "@type": "BlogPosting",
        "@id": `${url}#post`,
        mainEntityOfPage: url,
        url,
        headline: post.title,
        description: post.excerpt,
        datePublished: post.publishedDate,
        dateModified: post.updatedAt,
        inLanguage: "pt-BR",
        author: { "@id": IDS.person },
        publisher: { "@id": IDS.person },
        image: post.imageUrl
            ? absoluteUrl(post.imageUrl)
            : `${SITE_URL}/main.jpeg`,
        keywords: post.keywords ?? undefined,
        isPartOf: { "@id": `${SITE_URL}/blog#blog` },
    };
}

export function blogNode(posts: { slug: string; title: string; publishedDate: string }[]): Node {
    return {
        "@type": "Blog",
        "@id": `${SITE_URL}/blog#blog`,
        url: absoluteUrl("/blog"),
        name: "Blog do Psicólogo João Fernandes",
        inLanguage: "pt-BR",
        author: { "@id": IDS.person },
        blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            "@id": `${absoluteUrl(`/blog/${p.slug}`)}#post`,
            headline: p.title,
            url: absoluteUrl(`/blog/${p.slug}`),
            datePublished: p.publishedDate,
        })),
    };
}

export function therapyNode({
    path,
    name,
    description,
}: {
    path: string;
    name: string;
    description?: string | null;
}): Node {
    return {
        "@type": "MedicalTherapy",
        "@id": `${absoluteUrl(path)}#servico`,
        name,
        description: description ?? undefined,
        url: absoluteUrl(path),
        provider: { "@id": IDS.clinic },
    };
}

export function tutoringNode(): Node {
    const url = absoluteUrl(tutoring.path);
    return {
        "@type": "Service",
        "@id": `${url}#servico`,
        serviceType: "Aulas particulares",
        name: tutoring.name,
        description: tutoring.description,
        url,
        provider: { "@id": IDS.person },
        areaServed: [
            { "@type": "City", name: "São Paulo" },
            { "@type": "Country", name: "Brasil" },
        ],
        hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Aulas particulares",
            itemListElement: tutoring.tracks.map((t) => ({
                "@type": "Offer",
                itemOffered: {
                    "@type": "Course",
                    name: t.title,
                    description: t.description,
                    provider: { "@id": IDS.person },
                    inLanguage: "pt-BR",
                },
            })),
        },
    };
}

/** Entities every page carries (rendered once, in the root layout). */
export function siteGraph() {
    return graph(websiteNode(), personNode(), clinicNode());
}
