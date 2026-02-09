"use client"

import Image from "next/image";


export function About() {


  return (
    <section className="py-20 bg-white" id="about">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          <div>
            <h2 className="text-slate-900 mb-6 text-2xl">
              Sobre o profissional
            </h2>
            <div className="flex flex-col mb-4">
              <h3 className="text-xl">João Vitor Fernandes Domingues</h3>
              <span className="text-slate-900 text-sm opacity-70">CRP: 06/157908</span>
            </div>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Psicólogo clínico com atuação fundamentada na Análise do Comportamento, exercendo prática profissional desde 2019. Possui sólida formação acadêmica, com participação contínua em atividades de pesquisa e atualização.
            </p>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Para além da técnica, acredito que a terapia é um encontro humano. Meu compromisso é oferecer uma escuta atenta e livre de julgamentos, construindo um vínculo de confiança que permita a você explorar suas questões com segurança e caminhar em direção ao que valoriza.
            </p>
          </div>
          <div className="relative">
            <div className="aspect-[4/4] rounded-lg overflow-hidden shadow-xl">
              <Image
                width={500}
                height={500}
                src="/jv.jpeg"
                alt="Psicólogo João Fernandes"
                priority={true}
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
