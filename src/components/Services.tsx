import { Brain, Users, Heart, Lightbulb, Shield, Smile, Armchair, AlertCircle, ShieldAlert, NotebookPen, Camera, Video, Pin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const services = [
  // {
  //   icon: Video,
  //   title: "Consulta online",
  //   description: "Atendimento pelo Google Meet"
  // },
  // {
  //   icon: Pin,
  //   title: "Consulta presencial",
  //   description: "Atendimento em consultório próximo à Vila Madalena, São Paulo - SP"
  // },
  {
    icon: Brain,
    title: "Psicoterapia individual",
    description: "Atendimento Psicoterapêutico visando melhora da qualidade de vida do paciente, a ser realizado de forma presencial ou online.",
  },
  {
    icon: Users,
    title: "Acompanhamento para estudos",
    description: "Acompanhamento específico para o aprendizado de técnicas comportamentais de estudo. Adolescentes em período de provas de vestibular, adultos que prestam Concurso ou ainda curiosos que queiram aperfeiçoar seu repertório de estudos podem se beneficiar desse serviço",
  },
  {
    icon: NotebookPen,
    title: "Supervisão em Psicologia",
    description: "Supervisão clínica à outros psicólogos/as que atendam na abordagem teórico-prática da Análise do Comportamento",
  },
  {
    icon: Lightbulb,
    title: "Avaliação Psicológica e Psicodiagnóstica",
    description: "Avaliação psicológica e psicodiagnóstica para auxílio em diagnósticos comportamentais",
  },
  {
    icon: ShieldAlert,
    title: "Regulação Emocional em Momentos de Crise",
    description: "O serviço de Psicoterapia Individual é ofertado, porém com o objetivo de acolhimento e intervenção em momentos de urgência emocional. Exemplos: Divórcio recente, Gravidez, Luto, Suicídio, Diagnósticos de doenças crônicas de ordem biológica ou psiquiátrica, entre outros.",
  },
  {
    icon: Armchair,
    title: "Psicoterapia de casal ou familiar",
    description: "A Psicoterapia com foco na resolução de demandas/conflitos entre casais e/ou entre familiares também está a disposição.",
  }
];

export function Services() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 mb-4 text-2xl">Atendimentos</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Atendimentos Psicológicos fundamentados na Ciência do Comportamento e em práticas clínicas baseadas em evidências
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
