import Image from "next/image";

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
            <h2 className="text-slate-900 mb-6 text-2xl font-bold">
              Sobre o profissional
            </h2>
            <div className="flex flex-col mb-4">
              <h3 className="text-xl font-semibold text-slate-900">João Fernandes</h3>
              <span className="text-slate-600 text-sm mt-1">CRP 06/157908</span>
            </div>
            <p className="text-slate-600 mb-4 leading-relaxed">
              Psicólogo clínico com atuação fundamentada na Análise do Comportamento, exercendo prática profissional desde 2019. Possui sólida formação acadêmica, com participação contínua em atividades de pesquisa e atualização.
            </p>
            <p className="text-slate-600 mb-4 leading-relaxed">
              O processo terapêutico é construído de forma colaborativa, com foco em identificar padrões de comportamento e ampliar o repertório para lidar com as demandas da vida.
            </p>
            <p className="text-slate-600 leading-relaxed">
              O consultório em Vila Madelena oferece um espaço reservado e acolhedor, propício ao desenvolvimento pessoal e ao autoconhecimento.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
