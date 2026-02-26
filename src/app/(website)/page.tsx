import { Hero } from "@/components/Hero";

export const dynamic = "force-dynamic";
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

export default function Home() {
    return (
        <div className="min-h-screen">
            <Hero />
            <SoftCta />
            <Discussions />
            <section className="py-12 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
                    <NewsletterForm />
                </div>
            </section>
            <Services />
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

