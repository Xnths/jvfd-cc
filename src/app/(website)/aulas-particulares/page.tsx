import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { TutoringCta } from "@/components/TutoringCta";
import { tutoring } from "@/content/tutoring";
import { breadcrumbNode, faqNode, graph, tutoringNode, webPageNode } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { Editable } from "@/edit/Editable";
import { getTexts } from "@/lib/texts";
import { resolvedTutoringFaq } from "@/content/resolve";

export const metadata: Metadata = buildMetadata({
    absoluteTitle: tutoring.metaTitle,
    description: tutoring.description,
    path: tutoring.path,
});

export default async function AulasParticularesPage() {
    const texts = await getTexts();
    return (
        <div className="min-h-screen bg-white">
            <JsonLd
                data={graph(
                    webPageNode({ path: tutoring.path, name: tutoring.name, description: tutoring.description }),
                    tutoringNode(),
                    faqNode(resolvedTutoringFaq(texts)),
                    breadcrumbNode([{ name: tutoring.shortName, path: tutoring.path }]),
                )}
            />

            <section className="bg-slate-50 px-4 pb-20 pt-32">
                <div className="container mx-auto max-w-3xl text-center">
                    <Editable as="p" k="aulas.eyebrow" className="mb-4 text-sm font-semibold uppercase tracking-widest text-green-800">
                        {tutoring.eyebrow}
                    </Editable>
                    <Editable as="h1" k="aulas.headline" className="mb-6 text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
                        {tutoring.headline}
                    </Editable>
                    <Editable as="p" k="aulas.subheadline" multiline className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-slate-600">
                        {tutoring.subheadline}
                    </Editable>
                    <TutoringCta location="hero" />
                    <p className="mt-4 text-sm text-slate-500">
                        <Link href="/" className="underline">Psicólogo João Fernandes</Link> · CRP 06/157908
                    </p>
                </div>
            </section>

            <section className="px-4 py-20">
                <div className="container mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
                    {tutoring.tracks.map((track) => (
                        <article key={track.key} className="rounded-2xl border border-slate-200 p-6">
                            <Editable as="h2" k={`aulas.track.${track.key}.title`} className="mb-3 text-xl font-semibold text-slate-900">{track.title}</Editable>
                            <Editable as="p" k={`aulas.track.${track.key}.description`} multiline className="mb-4 leading-relaxed text-slate-600">{track.description}</Editable>
                            <ul className="list-disc space-y-1 pl-5 text-slate-700 marker:text-green-700">
                                {track.topics.map((topic, ti) => (
                                    <li key={topic}><Editable k={`aulas.track.${track.key}.topic.${ti}`}>{topic}</Editable></li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>

            <section className="bg-slate-50 px-4 py-20">
                <div className="container mx-auto max-w-4xl">
                    <Editable as="h2" k="aulas.how.title" className="mb-10 text-center text-2xl font-semibold text-slate-900">Como funciona</Editable>
                    <ol className="grid gap-6 md:grid-cols-4">
                        {tutoring.howItWorks.map((step, i) => (
                            <li key={step.title}>
                                <span className="mb-2 block text-3xl font-bold text-green-700">{i + 1}</span>
                                <Editable as="h3" k={`aulas.how.${i}.title`} className="mb-1 font-semibold text-slate-900">{step.title}</Editable>
                                <Editable as="p" k={`aulas.how.${i}.description`} className="text-sm leading-relaxed text-slate-600">{step.description}</Editable>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="px-4 py-20">
                <div className="container mx-auto max-w-3xl">
                    <Editable as="h2" k="aulas.faq.title" className="mb-8 text-center text-2xl font-semibold text-slate-900">Perguntas frequentes</Editable>
                    <ul className="space-y-6">
                        {tutoring.faq.map((item, fi) => (
                            <li key={item.question} className="border-b pb-4">
                                <Editable as="h3" k={`aulas.faq.${fi}.question`} className="mb-2 text-lg font-medium">{item.question}</Editable>
                                <Editable as="p" k={`aulas.faq.${fi}.answer`} multiline className="text-slate-600">{item.answer}</Editable>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-12 text-center">
                        <TutoringCta location="footer" />
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
