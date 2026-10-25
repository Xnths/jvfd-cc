import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProfileView } from "@/components/ProfileView";
import { ProfileSwap } from "@/edit/ProfileSwap";
import { DraftProfile } from "@/edit/DraftProfile";
import { getProfileBySlug, getProfiles } from "@/lib/queries";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { breadcrumbNode, graph, webPageNode } from "@/lib/jsonld";
import { SITE_URL } from "@/content/clinic";

export const revalidate = 86400;

type Params = { slug: string };

export async function generateStaticParams() {
    if (!process.env.API_INTERNAL_URL) return [];
    try {
        return (await getProfiles()).map((p) => ({ slug: p.slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug } = await params;
    const p = await getProfileBySlug(slug).catch(() => null);
    if (!p) return { title: "Perfil", robots: { index: false } };
    return buildMetadata({
        title: `${p.displayName}, ${p.jobTitle}`,
        description: `${p.displayName}: ${p.jobTitle}${p.crp ? `, CRP ${p.crp}` : ""}. ${p.approach}`.trim(),
        path: `/sobre/${p.slug}`,
        type: "profile",
        markdown: false,
    });
}

export default async function ProfilePage({ params }: { params: Promise<Params> }) {
    const { slug } = await params;
    const p = await getProfileBySlug(slug).catch(() => null);
    if (!p) {
        if ((await draftMode()).isEnabled) return <DraftProfile slug={slug} />;
        notFound();
    }
    const path = `/sobre/${p.slug}`;
    return (
        <div className="min-h-screen bg-white">
            <JsonLd
                data={graph(
                    webPageNode({ path, name: p.displayName, description: p.jobTitle, type: "ProfilePage" }),
                    {
                        "@type": "Person",
                        "@id": `${SITE_URL}${path}#person`,
                        name: p.fullName || p.displayName,
                        jobTitle: p.jobTitle,
                        url: absoluteUrl(path),
                        image: p.photo?.url ? absoluteUrl(p.photo.url) : undefined,
                        knowsAbout: p.knowsAbout.length ? p.knowsAbout : undefined,
                        knowsLanguage: p.languages.length ? p.languages : undefined,
                        alumniOf: p.alumniOf.length ? p.alumniOf.map((name) => ({ "@type": "EducationalOrganization", name })) : undefined,
                        sameAs: Object.values(p.links ?? {}).filter(Boolean),
                    },
                    breadcrumbNode([{ name: "Quem somos", path: "/sobre" }, { name: p.displayName, path }]),
                )}
            />
            <article className="container mx-auto max-w-3xl px-4 pb-20 pt-24">
                <ProfileSwap profileSlug={p.slug}>
                    <p className="mb-6 text-sm"><Link href="/sobre" className="text-green-700 hover:underline">← Quem somos</Link></p>
                    <ProfileView profile={p} />
                </ProfileSwap>
            </article>
            <Footer />
        </div>
    );
}
