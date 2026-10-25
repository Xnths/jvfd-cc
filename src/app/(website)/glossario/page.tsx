import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { Editable } from "@/edit/Editable";
import { getGlossary } from "@/lib/queries";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { breadcrumbNode, graph, webPageNode } from "@/lib/jsonld";
import { SITE_URL } from "@/content/clinic";

export const revalidate = 86400;

const baseMetadata = buildMetadata({
    title: "Glossário de psicologia e Análise do Comportamento",
    description: "Termos de psicologia e Análise do Comportamento explicados em linguagem simples, com revisão de um psicólogo.",
    path: "/glossario",
    markdown: false,
});

// Empty section pages stay out of search results until there is something to read.
export async function generateMetadata(): Promise<Metadata> {
    const items = await getGlossary().catch(() => []);
    return items.length ? baseMetadata : { ...baseMetadata, robots: { index: false, follow: true } };
}

export default async function GlossaryPage() {
    const terms = await getGlossary().catch(() => []);
    const groups = new Map<string, typeof terms>();
    for (const t of terms) {
        const letter = t.term.normalize("NFD").replace(/[̀-ͯ]/g, "")[0]?.toUpperCase() ?? "#";
        groups.set(letter, [...(groups.get(letter) ?? []), t]);
    }

    return (
        <div className="min-h-screen bg-white">
            <JsonLd
                data={graph(
                    webPageNode({ path: "/glossario", name: "Glossário", description: baseMetadata.description as string }),
                    {
                        "@type": "DefinedTermSet",
                        "@id": `${SITE_URL}/glossario#set`,
                        name: "Glossário de psicologia e Análise do Comportamento",
                        hasDefinedTerm: terms.map((t) => ({ "@type": "DefinedTerm", name: t.term, description: t.shortDefinition, url: absoluteUrl(`/glossario/${t.slug}`) })),
                    },
                    breadcrumbNode([{ name: "Glossário", path: "/glossario" }]),
                )}
            />
            <section className="container mx-auto max-w-3xl px-4 pb-20 pt-24">
                <Editable as="h1" k="glossary.title" className="mb-4 text-4xl font-bold text-slate-900">Glossário</Editable>
                <Editable as="p" k="glossary.intro" multiline className="mb-12 text-xl leading-relaxed text-slate-600">
                    Termos de psicologia e de Análise do Comportamento explicados em linguagem simples. Os textos são revisados por um psicólogo e servem para informar, não para substituir uma avaliação profissional.
                </Editable>
                {terms.length === 0 && <p className="text-slate-500">Os primeiros termos serão publicados em breve.</p>}
                {[...groups.entries()].map(([letter, items]) => (
                    <div key={letter} className="mb-10">
                        <h2 className="mb-3 border-b border-slate-200 pb-1 text-2xl font-semibold text-green-800">{letter}</h2>
                        <dl className="space-y-5">
                            {items.map((t) => (
                                <div key={t.slug}>
                                    <dt className="text-lg font-semibold"><Link href={`/glossario/${t.slug}`} className="text-slate-900 hover:text-green-700">{t.term}</Link></dt>
                                    <dd className="text-slate-600">{t.shortDefinition}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ))}
            </section>
            <Footer />
        </div>
    );
}
