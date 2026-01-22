import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Excellence } from "@/components/Excellence";
import { About } from "@/components/About";
import { Testimonials } from "@/components/testimonias";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { FAQ } from "@/components/faq";

export default function Home() {
    return (
        <div className="min-h-screen">
            <Hero />
            <Services />
            <About />
            <FAQ />
            <Testimonials />
            <Excellence />
            <Contact />
            <Footer />
            <Toaster />
        </div>
    );
}
