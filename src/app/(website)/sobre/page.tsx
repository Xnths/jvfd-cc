import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { Editable } from "@/edit/Editable";
import { getProfiles } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, webPageNode } from "@/lib/jsonld";

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
    title: "Quem somos",
    description: "Conheça a equipe: formação, registro profissional e experiência de quem cuida do conteúdo e do atendimento deste site.",
    path: "/sobre",
    markdown: false,
});

export default async function TeamPage() {
    const profiles = await getProfiles().catch(() => []);
    return (
        <div className="min-h-screen bg-white">
            <JsonLd data={graph(webPageNode({ path: "/sobre", name: "Quem somos", description: metadata.description as string }), breadcrumbNode([{ name: "Quem somos", path: "/sobre" }]))} />
            <section className="container mx-auto max-w-3xl px-4 pb-20 pt-24">
                <Editable as="h1" k="team.title" className="mb-4 text-4xl font-bold text-slate-900">Quem somos</Editable>
                <Editable as="p" k="team.intro" multiline className="mb-10 text-xl leading-relaxed text-slate-600">
                    Quem atende e quem cuida do conteúdo deste site, com formação e registro profissional.
                </Editable>
                <ul className="grid gap-6 sm:grid-cols-2">
                    {profiles.map((p) => (
                        <li key={p.id} className="rounded-2xl border border-slate-200 p-6">
                            <Link href={`/sobre/${p.slug}`} className="flex items-center gap-4">
                                {p.photo?.url && <Image src={p.photo.url} alt={p.photo.alt || p.displayName} width={72} height={72} className="h-18 w-18 rounded-full object-cover" />}
                                <span><span className="block text-lg font-semibold text-slate-900">{p.displayName}</span><span className="block text-sm text-slate-600">{p.jobTitle}{p.isClinician && p.crp ? ` · CRP ${p.crp}` : ""}</span></span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
            <Footer />
        </div>
    );
}
