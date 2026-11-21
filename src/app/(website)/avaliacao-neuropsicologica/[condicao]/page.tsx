import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Contact } from "@/components/Contact";
import { CredentialBand } from "@/components/CredentialBand";
import { Footer } from "@/components/Footer";
import { WhatsappCtaButton } from "@/components/WhatsappCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import {
    AVALIACAO_ANALYTICS_KEY,
    AVALIACAO_PATH,
    AVALIACAO_WHATSAPP_MESSAGE,
    SUBPAGE,
    conditionPath,
    conditions,
    getCondition,
    type Condition,
} from "@/content/avaliacoes";
import { resolvedConditionFaq } from "@/content/resolve";
import { Editable } from "@/edit/Editable";
import { contentFromApi } from "@/lib/api";
import { breadcrumbNode, credentialPersonNode, faqNode, graph, webPageNode } from "@/lib/jsonld";
import { getTreatmentBySlug } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { LANDING_THEMES } from "@/lib/service-themes";
import { getTexts } from "@/lib/texts";

// Condition pages of the avaliação (copy in src/content/avaliacoes.ts). Static: they build without the API; the
// WhatsApp text and analytics key are read from the avaliação service row so every CTA is tracked like the main page.
// No `dynamicParams = false`: in Next 16 a revalidated page of such a route regenerates as a 404 (NoFallbackError),
// which took these pages down after the deploy's revalidate-all. Unknown slugs get notFound() below.
export const revalidate = 86400;

type Params = { condicao: string };

const t = LANDING_THEMES.green;

export function generateStaticParams(): Params[] {
    return conditions.map((c) => ({ condicao: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { condicao } = await params;
    const c = getCondition(condicao);
    if (!c) return {};
    return buildMetadata({ absoluteTitle: c.metaTitle, description: c.metaDescription, path: conditionPath(c.slug) });
}

async function avaliacaoCta() {
    const svc = contentFromApi() ? (await getTreatmentBySlug("avaliacao-neuropsicologica").catch(() => null))?.service : undefined;
    return {
        message: svc?.whatsappMessage || AVALIACAO_WHATSAPP_MESSAGE,
        source: svc?.analyticsKey || AVALIACAO_ANALYTICS_KEY,
    };
}

function E({ k, as, className, multiline, children }: { k: string; as?: React.ElementType; className?: string; multiline?: boolean; children: string }) {
    return (
        <Editable k={k} as={as} className={className} multiline={multiline}>
            {children}
        </Editable>
    );
}

function Refs({ n }: { n?: number[] }) {
    if (!n?.length) return null;
    return (
        <sup className="ml-1 text-green-700">
            <a href="#referencias" className="underline">[{n.join(", ")}]</a>
        </sup>
    );
}

function H2({ k, children }: { k: string; children: string }) {
    return <E as="h2" k={k} className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 mb-5">{children}</E>;
}

export default async function ConditionPage({ params }: { params: Promise<Params> }) {
    const { condicao } = await params;
    const c = getCondition(condicao);
    if (!c) notFound();

    const path = conditionPath(c.slug);
    const k = (field: string) => `avaliacao.${c.slug}.${field}`;
    const cta = await avaliacaoCta();
    const faq = resolvedConditionFaq(c.slug, await getTexts().catch(() => ({})));
    const others = conditions.filter((o) => o.slug !== c.slug);

    const ctaButton = (key: string) => (
        <WhatsappCtaButton message={cta.message} source={cta.source} textKey={key} text={SUBPAGE.cta} btnClass={t.cta} size="responsive" />
    );

    return (
        <div className="min-h-screen bg-white">
            <JsonLd
                data={graph(
                    {
                        ...webPageNode({ path, name: `${SUBPAGE.h1Prefix} ${c.h1}`, description: c.metaDescription, type: "MedicalWebPage" }),
                        about: { "@type": "MedicalCondition", name: c.conditionName },
                        author: { "@id": credentialPersonNode()["@id"] },
                    },
                    credentialPersonNode(),
                    breadcrumbNode([
                        { name: SUBPAGE.breadcrumbParent, path: AVALIACAO_PATH },
                        { name: c.card.title, path },
                    ]),
                    faqNode(faq, path),
                )}
            />

            {/* 1–2. Hero: H1, lead, credentials, CTA */}
            <section className={`pt-5 pb-12 md:pt-12 md:pb-16 px-4 ${t.heroBg}`}>
                <div className="container mx-auto max-w-4xl">
                    <Breadcrumb className="mb-3 md:mb-4">
                        <BreadcrumbList className="text-xs md:text-sm">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild><Link href="/">{SUBPAGE.breadcrumbHome}</Link></BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild><Link href={AVALIACAO_PATH}>{SUBPAGE.breadcrumbParent}</Link></BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{c.card.title}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <h1 className={`font-serif text-[1.75rem] md:text-5xl font-semibold leading-[1.15] md:leading-tight mb-2 md:mb-5 ${t.heroHeading}`}>
                        <E k="avaliacao.sub.h1_prefix">{SUBPAGE.h1Prefix}</E> <E k={k("h1")}>{c.h1}</E>
                    </h1>
                    <E as="p" k={k("lead")} multiline className={`text-[15px] md:text-xl leading-snug md:leading-relaxed max-w-2xl mb-3 md:mb-8 ${t.heroText}`}>{c.lead}</E>
                    <CredentialBand className="mb-4 md:mb-8 max-w-3xl" />
                    {ctaButton("avaliacao.sub.cta_hero")}
                    <E as="p" k="avaliacao.sub.note" multiline className={`mt-4 text-sm max-w-xl ${t.heroNote}`}>{SUBPAGE.note}</E>
                </div>
            </section>

            <article className="px-4">
                <div className="container mx-auto max-w-3xl text-lg text-slate-700 leading-relaxed">
                    {/* 3. O que é */}
                    <section className="py-12 md:py-16" id="o-que-e">
                        <H2 k="avaliacao.sub.what_title">{SUBPAGE.whatIsTitle}</H2>
                        {c.whatIs.map((p, i) => (
                            <p key={i} className="mb-4">
                                <E k={k(`what_${i}`)} multiline>{p}</E>
                                {i === c.whatIs.length - 1 && <Refs n={c.whatIsRefs} />}
                            </p>
                        ))}
                        {c.whatIsLink && (
                            <p className="text-base">
                                <Link href={c.whatIsLink.href} className="font-semibold text-green-700 underline">
                                    <E k={k("what_link")}>{c.whatIsLink.text}</E>
                                </Link>
                            </p>
                        )}
                    </section>

                    {/* 4. Sinais */}
                    <section className="py-12 md:py-16 border-t border-slate-200" id="sinais">
                        <H2 k="avaliacao.sub.signs_title">{SUBPAGE.signsTitle}</H2>
                        <ul className="space-y-3">
                            {c.signs.map((s, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className={`mt-2.5 w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} aria-hidden />
                                    <E k={k(`sign_${i}`)}>{s}</E>
                                </li>
                            ))}
                        </ul>
                        <E as="p" k="avaliacao.sub.signs_note" multiline className="mt-5 text-base text-slate-600">{SUBPAGE.signsNote}</E>
                    </section>

                    {/* 5. O que investiga */}
                    <section className="py-12 md:py-16 border-t border-slate-200" id="o-que-investiga">
                        <H2 k="avaliacao.sub.investigates_title">{SUBPAGE.investigatesTitle}</H2>
                        {c.investigatesIntro && (
                            <p className="mb-6">
                                <E k={k("investigates_intro")} multiline>{c.investigatesIntro}</E>
                                <Refs n={c.investigatesRefs} />
                            </p>
                        )}
                        <dl className="grid gap-4 sm:grid-cols-2">
                            {c.investigates.map((f, i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <E as="dt" k={k(`investigates_${i}_fn`)} className="font-semibold text-slate-900">{f.fn}</E>
                                    <E as="dd" k={k(`investigates_${i}_text`)} multiline className="mt-1 text-base text-slate-600">{f.text}</E>
                                </div>
                            ))}
                        </dl>
                        <E as="p" k="avaliacao.sub.investigates_note" multiline className="mt-5 text-base text-slate-600">{SUBPAGE.investigatesNote}</E>
                    </section>

                    {/* 6. Como ajuda */}
                    <section className="py-12 md:py-16 border-t border-slate-200" id="como-ajuda">
                        <H2 k="avaliacao.sub.helps_title">{SUBPAGE.helpsTitle}</H2>
                        <ul className="space-y-3">
                            {c.helps.map((h, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className={`mt-2.5 w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} aria-hidden />
                                    <span>
                                        <E k={k(`helps_${i}`)} multiline>{h}</E>
                                        {i === 0 && <Refs n={c.helpsRefs} />}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {c.crisisLine && <E as="p" k={k("crisis_line")} className="mt-6 text-base text-slate-700">{c.crisisLine}</E>}
                    </section>

                    {/* 7. Como funciona */}
                    <section className="py-12 md:py-16 border-t border-slate-200" id="como-funciona">
                        <H2 k="avaliacao.sub.steps_title">{SUBPAGE.stepsTitle}</H2>
                        <ol className="space-y-3">
                            {SUBPAGE.steps.map((s, i) => (
                                <li key={i} className="flex gap-4">
                                    <span className={`w-7 h-7 shrink-0 rounded-full text-white text-sm font-semibold flex items-center justify-center ${t.stepBg}`}>{i + 1}</span>
                                    <span>
                                        <E k={`avaliacao.sub.steps_${i}_title`} className="font-semibold text-slate-900">{s.title}</E>
                                        {": "}
                                        <E k={`avaliacao.sub.steps_${i}_text`}>{s.text}</E>
                                    </span>
                                </li>
                            ))}
                        </ol>
                        <p className="mt-5 text-base">
                            <Link href={`${AVALIACAO_PATH}#como-funciona`} className="font-semibold text-green-700 underline">
                                <E k="avaliacao.sub.steps_link">{SUBPAGE.stepsLink}</E>
                            </Link>
                        </p>
                    </section>

                    {/* 8. FAQ */}
                    <section className="py-12 md:py-16 border-t border-slate-200" id="faq">
                        <H2 k="avaliacao.sub.faq_title">{SUBPAGE.faqTitle}</H2>
                        <ul className="space-y-6">
                            {c.faq.map((f, i) => (
                                <li key={i}>
                                    <E as="h3" k={k(`faq_${i}_q`)} className="text-lg font-semibold text-slate-900 mb-1">{f.question}</E>
                                    <E as="p" k={k(`faq_${i}_a`)} multiline className="text-slate-600">{f.answer}</E>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </article>

            {/* 9. Referências */}
            <section className="pb-12 px-4" id="referencias">
                <div className="container mx-auto max-w-3xl">
                    <E as="h2" k="avaliacao.sub.refs_title" className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">{SUBPAGE.refsTitle}</E>
                    <ol className="space-y-2 text-xs text-slate-500 leading-relaxed">
                        {c.references.map((r, i) => (
                            <li key={i}>
                                [{i + 1}] {r.text}{" "}
                                {r.doi && (
                                    <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer" className="underline">doi:{r.doi}</a>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* 10. Final CTA */}
            <section className={`py-14 px-4 ${t.soft}`}>
                <div className="container mx-auto max-w-2xl text-center">
                    <E as="h2" k="avaliacao.sub.closing_title" className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 mb-6">{SUBPAGE.closingTitle}</E>
                    {ctaButton("avaliacao.sub.cta_closing")}
                    <E as="p" k="avaliacao.sub.closing_note" multiline className="mt-4 text-sm text-slate-600 max-w-md mx-auto">{SUBPAGE.closingNote}</E>
                    <p className="mt-6 text-sm">
                        <Link href={AVALIACAO_PATH} className="font-semibold text-green-700 underline">
                            <E k="avaliacao.sub.back_link">{SUBPAGE.backLink}</E>
                        </Link>
                    </p>
                </div>
            </section>

            <OtherConditions others={others} />

            <Contact />
            <Footer />
        </div>
    );
}

function OtherConditions({ others }: { others: Condition[] }) {
    return (
        <nav className="py-10 px-4 border-t border-slate-200" aria-label={SUBPAGE.otherConditions}>
            <div className="container mx-auto max-w-3xl">
                <E as="h2" k="avaliacao.sub.other_title" className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">{SUBPAGE.otherConditions}</E>
                <ul className="flex flex-wrap gap-2">
                    {others.map((o) => (
                        <li key={o.slug}>
                            <Link href={conditionPath(o.slug)} className="inline-block rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-slate-500">
                                {o.card.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
}
