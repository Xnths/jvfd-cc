"use client";

import { Footer } from "@/components/Footer";
import { Contact } from "@/components/Contact";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface TreatmentPageProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function TreatmentPage({ title, subtitle, children }: TreatmentPageProps) {
    return (
        <main className="min-h-screen bg-white">
            <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Voltar para Início</span>
                    </Link>
                    <div className="font-semibold text-slate-800 hidden sm:block">João Fernandes | Psicólogo</div>
                </div>
            </header>

            <section className="pt-32 pb-20 px-4 bg-slate-900 text-white">
                <div className="container mx-auto max-w-4xl text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">{title}</h1>
                    {subtitle && (
                        <p className="text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl mx-auto md:mx-0 font-light">
                            {subtitle}
                        </p>
                    )}
                </div>
            </section>

            <section className="py-16 px-4 md:py-24">
                <div className="container mx-auto max-w-3xl prose prose-slate prose-lg lg:prose-xl">
                    {children}
                </div>
            </section>

            <Contact />

            <Footer />
        </main>
    );
}
