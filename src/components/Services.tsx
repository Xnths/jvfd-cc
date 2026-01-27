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
      "A psicoterapia individual oferece um espaço estruturado para compreender padrões de comportamento, emoções recorrentes e dificuldades persistentes, possibilitando mudanças graduais e sustentáveis.",
  },
  {
    icon: Users,
    title: "Dificuldade de concentração, rotina desorganizada ou baixo rendimento",
    description:
      "O acompanhamento psicológico pode auxiliar no desenvolvimento de estratégias comportamentais para estudo, organização e manejo do tempo, especialmente em contextos de alta exigência como vestibulares e concursos.",
  },
  {
    icon: ShieldAlert,
    title: "Momentos de crise exigem acolhimento imediato",
    description:
      "Em situações de sofrimento intenso — como luto, separações, adoecimento ou atentar contra a própria vida — o atendimento psicológico oferece acolhimento, estabilização emocional e orientação clínica inicial.",
  },
  {
    icon: Armchair,
    title: "Conflitos recorrentes em relacionamentos ou na família",
    description:
      "A psicoterapia com casais ou famílias auxilia na compreensão de padrões de interação, melhora da comunicação e redução de conflitos que se repetem ao longo do tempo.",
  },
  {
    icon: Lightbulb,
    title: "Dúvidas sobre o que está acontecendo com você",
    description:
      "A avaliação psicológica contribui para a compreensão funcional de comportamentos, emoções e queixas apresentadas, auxiliando no direcionamento clínico mais adequado.",
  },
  {
    icon: NotebookPen,
    title: "Psicólogos também precisam de suporte clínico",
    description:
      "A supervisão clínica em Análise do Comportamento oferece um espaço técnico para discussão de casos, tomada de decisão ética e refinamento da prática profissional.",
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
