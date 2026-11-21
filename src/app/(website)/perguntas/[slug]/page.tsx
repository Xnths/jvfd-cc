import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { RichText } from "@/components/RichText";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAnsweredQuestions } from "@/lib/queries";
import { plainText } from "@/lib/richtext-text";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbNode, faqNode, graph, webPageNode } from "@/lib/jsonld";

export const revalidate = 86400;

type Params = { slug: string };

async function find(slug: string) {
    return (await getAnsweredQuestions().catch(() => [])).find((q) => q.slug === slug) ?? null;
}

export async function generateStaticParams() {
    if (!process.env.API_INTERNAL_URL) return [];
    try {
        return (await getAnsweredQuestions()).flatMap((q) => (q.slug ? [{ slug: q.slug }] : []));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const q = await find((await params).slug);
    if (!q) return { title: "Pergunta", robots: { index: false } };
    return buildMetadata({ title: q.question, description: plainText(q.answer).slice(0, 160), path: `/perguntas/${q.slug}`, markdown: true });
}

export default async function QuestionPage({ params }: { params: Promise<Params> }) {
    const q = await find((await params).slug);
    if (!q) notFound();
    const path = `/perguntas/${q.slug}`;
    return (
        <div className="min-h-screen bg-white">
            <JsonLd data={graph(webPageNode({ path, name: q.question }), faqNode([{ question: q.question, answer: plainText(q.answer) }], path), breadcrumbNode([{ name: "Perguntas", path: "/perguntas" }, { name: q.question, path }]))} />
            <article className="container mx-auto max-w-3xl px-4 pb-16 pt-8 md:pb-20 md:pt-24">
                <p className="mb-2 text-base md:text-sm"><Link href="/perguntas" className="-my-2 inline-block py-2 text-green-700 hover:underline">← Perguntas e respostas</Link></p>
                <h1 className="mb-6 text-4xl font-bold text-slate-900">{q.question}</h1>
                <div className="prose prose-lg prose-slate max-w-none"><RichText content={q.answer} /></div>
                <p className="mt-10 text-sm text-slate-500">Resposta informativa, sem caráter de atendimento. Em crise, ligue <a href="tel:188" className="underline">188 (CVV)</a> ou <a href="tel:192" className="underline">192 (SAMU)</a>.</p>
            </article>
            <Footer />
        </div>
    );
}
