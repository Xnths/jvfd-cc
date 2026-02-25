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

export default function Home() {
    return (
        <div className="min-h-screen">
            <Hero />
            <SoftCta />
            <Discussions />
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
