import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { ScreeningTool } from "@/components/ScreeningTool";
import { Editable } from "@/edit/Editable";
import { GAD7 as tool } from "@/content/screening";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, webPageNode } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({ title: tool.title, description: tool.description, path: "/ferramentas/gad-7", markdown: false });

export default function Page() {
    return (
        <div className="min-h-screen bg-white">
            <JsonLd data={graph(webPageNode({ path: "/ferramentas/gad-7", name: tool.title, description: tool.description }), breadcrumbNode([{ name: "Ferramentas", path: "/ferramentas" }, { name: tool.name, path: "/ferramentas/gad-7" }]))} />
            <article className="container mx-auto max-w-3xl px-4 pb-20 pt-24">
                <p className="mb-2 text-sm"><Link href="/ferramentas" className="text-green-700 hover:underline">← Ferramentas</Link></p>
                <h1 className="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">{tool.title}</h1>
                <div role="note" className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                    <p><strong>Importante:</strong> este questionário é uma triagem, não um diagnóstico, e não substitui uma avaliação com um profissional. Suas respostas ficam apenas neste navegador e não são guardadas nem enviadas.</p>
                    <p className="mt-2">Em crise ou com pensamentos de se machucar: <strong>CVV 188</strong> (24 horas, gratuito) ou <strong>SAMU 192</strong>.</p>
                </div>
                <ScreeningTool tool={tool} />
                <Editable as="p" k="tools.gad-7.after" multiline className="mt-10 text-slate-600">
                    Se os resultados chamaram sua atenção ou se você quer conversar sobre como tem se sentido, procure um psicólogo de confiança. Também é possível conversar com o João pelo WhatsApp, sem compromisso.
                </Editable>
                <section className="mt-10 border-t pt-6">
                    <h2 className="mb-2 text-lg font-semibold text-slate-900">Referências</h2>
                    <ul className="list-disc space-y-1 pl-6 text-sm text-slate-600">{tool.sources.map((s) => <li key={s}>{s}</li>)}</ul>
                    <p className="mt-3 text-xs text-slate-500">Versões de domínio público dos instrumentos. As perguntas seguem as traduções em português disponibilizadas gratuitamente pelos autores.</p>
                </section>
            </article>
            <Footer />
        </div>
    );
}
