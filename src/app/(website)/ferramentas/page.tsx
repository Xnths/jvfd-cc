import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { Editable } from "@/edit/Editable";
import { SCREENINGS } from "@/content/screening";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, webPageNode } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({
    title: "Ferramentas de autoavaliação",
    description: "Questionários de rastreio de ansiedade e depressão (GAD-7 e PHQ-9). O resultado é calculado no seu navegador e não é guardado.",
    path: "/ferramentas",
    markdown: false,
});

export default function ToolsPage() {
    return (
        <div className="min-h-screen bg-white">
            <JsonLd data={graph(webPageNode({ path: "/ferramentas", name: "Ferramentas de autoavaliação", description: metadata.description as string }), breadcrumbNode([{ name: "Ferramentas", path: "/ferramentas" }]))} />
            <section className="container mx-auto max-w-3xl px-4 pb-16 pt-8 md:pb-20 md:pt-24">
                <Editable as="h1" k="tools.title" className="mb-4 text-4xl font-bold text-slate-900">Ferramentas de autoavaliação</Editable>
                <Editable as="p" k="tools.intro" multiline className="mb-10 text-xl leading-relaxed text-slate-600">
                    Questionários curtos e conhecidos na psicologia, para você entender melhor como tem se sentido. Eles não fazem diagnóstico e nada do que você responde é guardado ou enviado.
                </Editable>
                <ul className="grid gap-4 sm:grid-cols-2">
                    {Object.values(SCREENINGS).map((t) => (
                        <li key={t.slug} className="relative rounded-2xl border border-slate-200 p-5 transition hover:border-slate-400 sm:p-6">
                            {/* Stretched link: the whole card opens the tool. */}
                            <h2 className="text-xl font-semibold text-slate-900"><Link href={`/ferramentas/${t.slug}`} className="hover:text-green-700 after:absolute after:inset-0 after:rounded-2xl after:content-['']">{t.name}</Link></h2>
                            <p className="mt-2 text-base sm:text-sm text-slate-600">{t.title}</p>
                        </li>
                    ))}
                </ul>
            </section>
            <Footer />
        </div>
    );
}
