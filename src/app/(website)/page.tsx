import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Excellence } from "@/components/Excellence";
import { About } from "@/components/About";
import { Testimonials } from "@/components/testimonias";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { FAQ } from "@/components/faq";
import { Discussions } from "@/components/Discussions";
import { SoftCta } from "@/components/SoftCta";
import { NewsletterForm } from "@/components/NewsletterForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { faqNode, graph, webPageNode } from "@/lib/jsonld";
import { getTexts } from "@/lib/texts";
import { resolvedFaq, resolvedTutoringFaq } from "@/content/resolve";

// Rendered per request (it reads ?lgbt=true), but all CMS reads go through
// the cached query layer, so no request hits the database directly.
export const dynamic = "force-dynamic";

const description =
    "Psicólogo particular, LGBT+ e especialista em Análise do Comportamento (PUCSP). Psicoterapia online para todo o Brasil ou presencial na Vila Madalena, SP. Agende sua sessão.";

// The ?lgbt=true campaign variant canonicalizes to "/" like every other visit.
export const metadata: Metadata = buildMetadata({
    absoluteTitle: "Psicólogo João Fernandes | Terapia Comportamental Online e Presencial",
    description,
    path: "/",
});

export default async function Home({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const showLgbt = params.lgbt === "true";
    const texts = await getTexts();

    return (
        <div className="min-h-screen">
            <JsonLd
                data={graph(
                    webPageNode({ path: "/", name: "Psicólogo João Fernandes", description }),
                    faqNode(resolvedFaq(texts)),
                )}
            />
            <Hero showLgbt={showLgbt} />
            <SoftCta />
            <Discussions />
            <section className="py-12 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
                    <NewsletterForm />
                </div>
            </section>
            <Services showLgbt={showLgbt} />
            <Testimonials />
            <About />
            <Excellence />
            <FAQ />
            <Contact />
            <Footer />
            <Toaster />
        </div>
    );
}

