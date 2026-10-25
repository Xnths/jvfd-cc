import Image from "next/image";
import { Editable } from "@/edit/Editable";

export function SobreJoao() {
  return (
    <section className="py-20 bg-white" id="sobre">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div className="relative order-2 lg:order-1">
            <div className="aspect-[4/4] rounded-lg overflow-hidden shadow-xl">
              <Image
                width={747}
                height={665}
                src="/jv.jpeg"
                alt="Psicólogo João Fernandes"
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Editable as="h2" k="presencial.about.title" className="text-slate-900 mb-6 text-2xl font-bold">
              Sobre o profissional
            </Editable>
            <div className="flex flex-col mb-4">
              <Editable as="h3" k="presencial.about.name" className="text-xl font-semibold text-slate-900">João Fernandes</Editable>
              <span className="text-slate-600 text-sm mt-1">CRP 06/157908</span>
            </div>
            <Editable as="p" k="presencial.about.p1" multiline className="text-slate-600 mb-4 leading-relaxed">
              Psicólogo clínico com atuação fundamentada na Análise do Comportamento, exercendo prática profissional desde 2019. Possui sólida formação acadêmica, com participação contínua em atividades de pesquisa e atualização.
            </Editable>
            <Editable as="p" k="presencial.about.p2" multiline className="text-slate-600 mb-4 leading-relaxed">
              O processo terapêutico é construído de forma colaborativa, com foco em identificar padrões de comportamento e ampliar o repertório para lidar com as demandas da vida.
            </Editable>
            <Editable as="p" k="presencial.about.p3" multiline className="text-slate-600 leading-relaxed">
              O consultório em Vila Madalena oferece um espaço reservado e acolhedor, propício ao desenvolvimento pessoal e ao autoconhecimento.
            </Editable>
          </div>
        </div>
      </div>
    </section>
  );
}
