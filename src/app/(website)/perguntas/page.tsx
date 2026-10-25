import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { RichText } from "@/components/RichText";
import { QuestionForm } from "@/components/QuestionForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { Editable } from "@/edit/Editable";
import { getAnsweredQuestions } from "@/lib/queries";
import { plainText } from "@/lib/richtext-text";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbNode, faqNode, graph, webPageNode } from "@/lib/jsonld";

export const revalidate = 86400;

const baseMetadata = buildMetadata({
    title: "Perguntas e respostas sobre psicologia e terapia",
    description: "Dúvidas frequentes sobre terapia, Análise do Comportamento e saúde mental, respondidas por um psicólogo.",
    path: "/perguntas",
    markdown: false,
});

// Empty section pages stay out of search results until there is something to read.
export async function generateMetadata(): Promise<Metadata> {
    const items = await getAnsweredQuestions().catch(() => []);
    return items.length ? baseMetadata : { ...baseMetadata, robots: { index: false, follow: true } };
}

export default async function QuestionsPage() {
    const questions = await getAnsweredQuestions().catch(() => []);
    return (
        <div className="min-h-screen bg-white">
            <JsonLd
                data={graph(
                    webPageNode({ path: "/perguntas", name: "Perguntas e respostas", description: baseMetadata.description as string }),
                    faqNode(questions.map((q) => ({ question: q.question, answer: plainText(q.answer) }))),
                    breadcrumbNode([{ name: "Perguntas", path: "/perguntas" }]),
                )}
            />
            <section className="container mx-auto max-w-3xl px-4 pb-20 pt-24">
                <Editable as="h1" k="questions.title" className="mb-4 text-4xl font-bold text-slate-900">Perguntas e respostas</Editable>
                <Editable as="p" k="questions.intro" multiline className="mb-12 text-xl leading-relaxed text-slate-600">
                    Dúvidas sobre terapia, comportamento e saúde mental, respondidas pelo psicólogo. As respostas são informativas e não substituem avaliação ou atendimento individual.
                </Editable>
                <div className="space-y-10">
                    {questions.length === 0 && <p className="text-slate-500">As primeiras respostas serão publicadas em breve.</p>}
                    {questions.map((q) => (
                        <article key={q.id} id={q.slug ?? undefined}>
                            <h2 className="mb-3 text-2xl font-semibold text-slate-900">{q.slug ? <Link href={`/perguntas/${q.slug}`} className="hover:text-green-700">{q.question}</Link> : q.question}</h2>
                            <div className="prose prose-lg prose-slate max-w-none"><RichText content={q.answer} /></div>
                        </article>
                    ))}
                </div>
                <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <Editable as="h2" k="questions.form_title" className="mb-3 text-2xl font-semibold text-slate-900">Envie sua pergunta</Editable>
                    <QuestionForm />
                </div>
            </section>
            <Footer />
        </div>
    );
}
