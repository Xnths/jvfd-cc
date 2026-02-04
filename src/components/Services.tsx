"use client"

import {
  Brain,
  Users,
  Lightbulb,
  ShieldAlert,
  Armchair,
  NotebookPen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { FaWhatsapp } from "react-icons/fa";
import { whatsappUrl } from "@/lib/constant";
import { useSectionAnalytics } from "@/hooks/use-section-analytics";

const services = [
  {
    icon: Brain,
    title: "Quando lidar sozinho já não está funcionando",
    description:
      "A psicoterapia oferece um espaço de escuta ativa e sem julgamentos. Juntos, vamos compreender padrões que trazem sofrimento e construir novas formas de lidar com suas emoções e desafios.",
  },
  {
    icon: Users,
    title: "Dificuldade de concentração e organização",
    description:
      "Se a rotina parece caótica ou o rendimento caiu, podemos desenvolver estratégias práticas e personalizadas para melhorar seu foco e  gestão de tempo, respeitando seu ritmo.",
  },
  {
    icon: ShieldAlert,
    title: "Acolhimento imediato para momentos difíceis",
    description:
      "Em crises intensas — como luto, separações ou ansiedade extrema — o mais importante é não passar por isso sozinho. Ofereço suporte para estabilizar suas emoções e encontrar segurança.",
  },
  {
    icon: Armchair,
    title: "Conflitos nos relacionamentos",
    description:
      "Problemas com parceiros ou família são comuns, mas desgastantes. Vamos trabalhar para melhorar a comunicação, estabelecer limites saudáveis e entender a dinâmica dessas relações.",
  },
  {
    icon: Lightbulb,
    title: "Autoconhecimento e Entendimento",
    description:
      "Muitas vezes, não sabemos explicar o que sentimos. A avaliação psicológica ajuda a dar nome e sentido para suas angústias, sendo o primeiro passo para a mudança.",
  },
  {
    icon: NotebookPen,
    title: "Supervisão para Psicólogos",
    description:
      "Para colegas de profissão, ofereço supervisão clínica em Análise do Comportamento, focada em discussão de casos, ética e aprimoramento técnico com parceira.",
  },
];

export function Services() {
  useSectionAnalytics("services")

  return (
    <section className="py-20 bg-slate-50" id="services">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 mb-4 text-2xl">
            Como posso te ajudar?
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Nem sempre é fácil identificar quando procurar ajuda psicológica.
            Muitas vezes, dificuldades emocionais, comportamentais ou relacionais
            se acumulam ao longo do tempo e começam a impactar diferentes áreas da vida.
            Abaixo estão algumas situações em que o acompanhamento psicológico pode ser indicado.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card
                key={index}
                className="border-slate-200 bg-white hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <CardTitle className="text-slate-900 text-lg">
                    {service.title}
                  </CardTitle>
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

        {/* CTA pós-evocação */}
        <div className="mt-16 flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp className="w-5 h-5" />
              Agendar consulta pelo WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
