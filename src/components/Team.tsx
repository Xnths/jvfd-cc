import { Card, CardContent } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const testimonials = [
  {
    name: "Paciente A.",
    context: "Atendimento presencial",
    testimonial:
      "Ao longo do acompanhamento, passei a identificar padrões do meu próprio comportamento e as condições em que eles ocorriam. Isso possibilitou mudanças consistentes no meu dia a dia.",
    image:
      "https://images.unsplash.com/photo-1649589244330-09ca58e4fa64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    name: "Paciente B.",
    context: "Atendimento presencial",
    testimonial:
      "O trabalho foi estruturado, objetivo e baseado em observação prática. Com o tempo, desenvolvi repertórios mais eficazes para lidar com situações que antes produziam sofrimento intenso.",
    image:
      "https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    name: "Paciente C.",
    context: "Atendimento online",
    testimonial:
      "A análise das contingências do meu ambiente ajudou a compreender por que certos comportamentos se mantinham. As intervenções foram claras e aplicáveis fora da sessão.",
    image:
      "https://images.unsplash.com/photo-1755189118414-14c8dacdb082?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
];

export function Team() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 mb-4 text-2xl">Depoimentos de pacientes</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Relatos de pessoas que participaram de processos terapêuticos baseados na Análise do Comportamento
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((item, index) => (
            <Card
              key={index}
              className="border-slate-200 overflow-hidden hover:shadow-lg transition-shadow bg-white"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <ImageWithFallback
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-slate-900 mb-1">{item.name}</h3>
                <p className="text-red-600 mb-3">{item.context}</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  “{item.testimonial}”
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
