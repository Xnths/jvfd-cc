"use client"

import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Hero() {
  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-screen min-h-[600px] flex items-center">
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1758873268053-675432cd8922?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB0aGVyYXB5JTIwb2ZmaWNlfGVufDF8fHx8MTc2Mzc1MTA5Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Ambiente clínico para atendimento psicológico"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/60"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-white mb-6 text-5xl md:text-6xl lg:text-7xl leading-tight">
            Clínica João Fernandes
          </h1>
          <p className="text-slate-300 mb-10 text-xl md:text-2xl leading-relaxed max-w-2xl">
            Atendimento psicológico.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              onClick={scrollToContact}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg"
            >
              Agendar atendimento
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToContact}
              className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-slate-900 px-8 py-6 text-lg transition-all"
            >
              Saiba mais
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
