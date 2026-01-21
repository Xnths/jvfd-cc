import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { About } from "@/components/About";
import { Team } from "@/components/Team";
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
            <Team />
            <FAQ />
            <Contact />
            <Footer />
            <Toaster />
        </div>
    );
}
