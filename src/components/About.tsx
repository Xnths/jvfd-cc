import { CheckCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const values = [
  "Atuação clínica baseada na Análise do Comportamento",
  "Atendimento psicológico presencial e online",
  "Avaliação e acompanhamento de repertórios comportamentais",
  "Intervenções orientadas por evidências empíricas",
  "Experiência em contextos clínicos e hospitalares",
];

export function About() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          <div>
            <h2 className="text-slate-900 mb-6 text-2xl">
              Sobre o profissional
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Possui graduação em Psicologia pela Pontifícia Universidade Católica de São Paulo - PUCSP (2019). Aperfeiçoado em Psicologia Hospitalar pela Psicocare (2019). Envolvido em linhas de pesquisa ao longo de toda a graduação (Iniciação Científica, Monitorias, Apresentações em Congressos, Simpósios, Organização de eventos acadêmicos estudantis). Atualmente cursa 2 Pós-graduações, se especializando em Neuropsicologia pelo Hospital Israelita Albert Einstein e em Neurociências, Comportamento e Psicopatologia pela PUCPR. Atua como Psicólogo Clínico na abordagem Analítico-Comportamental.
            </p>

            <div className="space-y-4">
              {values.map((value, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1620302044935-444961a5d028?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwc3ljaG9sb2d5JTIwY2xpbmljJTIwcmVjZXB0aW9ufGVufDF8fHx8MTc2Mzg1MTkxNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Ambiente clínico para atendimento psicológico"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
