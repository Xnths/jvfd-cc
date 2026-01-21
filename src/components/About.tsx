import { CheckCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const values = [
  "Graduado em Psicologia pela Pontifícia Universidade Católica de São Paulo - PUCSP",
  "Aperfeiçoado em Psicologia Hospitalar pela Psicocare",
  "Pós graduando em Neuropsicologia pelo Hospital Israelita Albert Einstein",
  "Pós graduando em Neurociências, Comportamento e Psicopatologia pela Pontifícia Universidade Católica do Paraná - PUCPR",
  "Formação Complementar do tipo Curso em Filosofia Oriental pela Universidade Harvard",
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
              Psicólogo Clínico atuante no mercado desde 2019 e envolvido em linhas de pesquisa ao longo de toda a graduação (Iniciação Científica, Monitorias, Apresentações em Congressos, Simpósios, Organização de eventos acadêmicos estudantis). Realiza atendimentos psicoterapêuticos à luz da abordagem Analítico-Comportamental.
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
