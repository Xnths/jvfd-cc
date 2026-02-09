"use client"

import { ImageWithFallback } from "./figma/ImageWithFallback";


export function Hero() {


  return (
    <section className="relative h-screen min-h-[600px] flex items-center" id="hero">
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="/consultorio.png"
          alt="Ambiente clínico para atendimento psicológico"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/60"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-white mb-6 text-5xl md:text-6xl lg:text-7xl leading-tight">
            Atendimento Psicológico Clínico
            <br />
            <strong className="font-bold">João Fernandes</strong>
          </h1>
          <p className="text-slate-300 mb-10 text-xl md:text-2xl leading-relaxed max-w-2xl text-justify">
            Atendimento psicológico <strong>online</strong> e <strong>presencial</strong>, fundamentado em práticas baseadas em evidências científicas, com foco no cuidado clínico e no acompanhamento responsável do processo terapêutico.
          </p>
        </div>
      </div>
    </section>
  );
}
