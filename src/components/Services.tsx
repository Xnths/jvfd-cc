import { Brain, Users, Heart, Lightbulb, Shield, Smile } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const services = [
  {
    icon: Brain,
    title: "Psicoterapia individual",
    description: "Atendimento clínico individual com foco na análise funcional do comportamento, considerando contingências históricas e atuais que organizam o repertório do indivíduo.",
  },
  {
    icon: Users,
    title: "Atendimento a adultos e adolescentes",
    description: "Intervenções psicológicas voltadas ao desenvolvimento e modificação de repertórios comportamentais em diferentes contextos sociais e familiares.",
  },
  {
    icon: Heart,
    title: "Processos de regulação emocional",
    description: "Acompanhamento clínico direcionado à ampliação de repertórios de enfrentamento e manejo de respostas emocionais em situações aversivas.",
  },
  {
    icon: Lightbulb,
    title: "Intervenções baseadas em evidências",
    description: "Planejamento terapêutico fundamentado em dados empíricos da Análise do Comportamento e das Neurociências.",
  },
  {
    icon: Shield,
    title: "Avaliação e acompanhamento clínico",
    description: "Levantamento funcional de queixas psicológicas e monitoramento sistemático de variáveis comportamentais ao longo do processo terapêutico.",
  },
  {
    icon: Smile,
    title: "Promoção de qualidade de vida",
    description: "Construção de repertórios comportamentais mais adaptativos, favorecendo autonomia, bem-estar e funcionamento cotidiano.",
  },
];

export function Services() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 mb-4 text-2xl">Serviços oferecidos</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Atendimentos psicológicos fundamentados na ciência do comportamento e em práticas clínicas baseadas em evidências
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="border-slate-200 hover:shadow-lg transition-shadow bg-white">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <CardTitle className="text-slate-900">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
