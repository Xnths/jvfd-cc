import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { RichText } from "@/components/RichText";
import { JsonLd } from "@/components/seo/JsonLd";
import { TermSwap } from "@/edit/TermSwap";
import { DraftTerm } from "@/edit/DraftTerm";
import { getGlossary, getGlossaryTerm } from "@/lib/queries";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { breadcrumbNode, graph, webPageNode } from "@/lib/jsonld";
import { SITE_URL } from "@/content/clinic";

export const revalidate = 86400;

type Params = { slug: string };

export async function generateStaticParams() {
    if (!process.env.API_INTERNAL_URL) return [];
    try {
        return (await getGlossary()).map((t) => ({ slug: t.slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { slug } = await params;
    const term = await getGlossaryTerm(slug).catch(() => null);
    if (!term) return { title: "Termo", robots: { index: false } };
    return buildMetadata({ title: `${term.term}: o que é`, description: term.shortDefinition, path: `/glossario/${term.slug}`, markdown: false });
}

export default async function TermPage({ params }: { params: Promise<Params> }) {
    const { slug } = await params;
    const term = await getGlossaryTerm(slug).catch(() => null);
    if (!term) {
        if ((await draftMode()).isEnabled) return <DraftTerm slug={slug} />;
        notFound();
    }
    const path = `/glossario/${term.slug}`;
    const sources: string[] = Array.isArray(term.sources) ? term.sources : [];

    return (
        <div className="min-h-screen bg-white">
            <JsonLd
                data={graph(
                    webPageNode({ path, name: term.term, description: term.shortDefinition }),
                    {
                        "@type": "DefinedTerm",
                        "@id": `${SITE_URL}${path}#term`,
                        name: term.term,
                        alternateName: term.altNames.length ? term.altNames : undefined,
                        description: term.shortDefinition,
                        url: absoluteUrl(path),
                        inDefinedTermSet: `${SITE_URL}/glossario#set`,
                    },
                    breadcrumbNode([{ name: "Glossário", path: "/glossario" }, { name: term.term, path }]),
                )}
            />
            <article className="container mx-auto max-w-3xl px-4 pb-20 pt-24">
                <TermSwap termId={term.slug}>
                    <p className="mb-2 text-sm"><Link href="/glossario" className="text-green-700 hover:underline">← Glossário</Link></p>
                    <h1 className="mb-4 text-4xl font-bold text-slate-900">{term.term}</h1>
                    {term.altNames.length > 0 && <p className="mb-4 text-sm text-slate-500">Também chamado de: {term.altNames.join(", ")}</p>}
                    <p className="mb-8 text-xl leading-relaxed text-slate-600">{term.shortDefinition}</p>
                    <div className="prose prose-lg prose-slate max-w-none"><RichText content={term.body} /></div>
                    {sources.length > 0 && (
                        <section className="mt-10 border-t pt-6">
                            <h2 className="mb-2 text-lg font-semibold text-slate-900">Referências</h2>
                            <ol className="list-decimal space-y-1 pl-6 text-sm text-slate-600">{sources.map((s, i) => <li key={i}>{s}</li>)}</ol>
                        </section>
                    )}
                    {term.reviewedBy && (
                        <p className="mt-8 text-sm text-slate-500">
                            Revisado por <Link href={`/sobre/${term.reviewedBy.slug}`} className="text-green-700 hover:underline">{term.reviewedBy.name}</Link>
                            {term.reviewedBy.crp ? `, CRP ${term.reviewedBy.crp}` : ""}. Este texto é informativo e não substitui avaliação ou acompanhamento psicológico.
                        </p>
                    )}
                </TermSwap>
            </article>
            <Footer />
        </div>
    );
}
