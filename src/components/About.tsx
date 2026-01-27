import { CheckCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

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
              Psicólogo clínico com atuação fundamentada na Análise do comportamento, exercendo prática profissional desde 2019. Possui sólida formação acadêmica, com participação contínua em atividades de pesquisa ao longo da graduação, incluindo iniciações científicas, monitorias, apresentações em congressos e simpósios, além da organização de eventos acadêmicos.
            </p>
          </div>
          <div className="relative">
            <div className="aspect-[4/4] rounded-lg overflow-hidden shadow-xl">
              <ImageWithFallback
                src="jv.jpeg"
                alt="Foto do profissional"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
