"use client"

import {
  Brain,
  Users,
  Lightbulb,
  ShieldAlert,
  Armchair,
  NotebookPen,
  ArrowRight,
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
import Link from "next/link";
import { sendGAEvent } from "@next/third-parties/google";
import { useTimeToAction } from "@/hooks/use-time-to-action";


const services = [
  {
    icon: Brain,
    title: "Quando lidar sozinho já não está funcionando",
    description:
      "A psicoterapia oferece um espaço de escuta ativa e sem julgamentos. Juntos, vamos compreender padrões que trazem sofrimento e construir novas formas de lidar com suas emoções e desafios.",
    href: "/psicoterapia",
  },
  {
    icon: Users,
    title: "Dificuldade de concentração e organização",
    description:
      "Se a rotina parece caótica ou o rendimento caiu, podemos desenvolver estratégias práticas e personalizadas para melhorar seu foco e  gestão de tempo, respeitando seu ritmo.",
    href: "/foco-organizacao",
  },
  {
    icon: ShieldAlert,
    title: "Acolhimento imediato para momentos difíceis",
    description:
      "Em momentos de grande angústia — como perdas significativas, separações ou inquietações intensas — o mais importante é não passar por isso sozinho. Ofereço suporte para estabilizar suas emoções e encontrar segurança.",
    href: "/plantao",
  },
  {
    icon: Armchair,
    title: "Conflitos nos relacionamentos",
    description:
      "Problemas com parceiros ou família são comuns, mas desgastantes. Vamos trabalhar para melhorar a comunicação, estabelecer limites saudáveis e entender a dinâmica dessas relações.",
    href: "/terapia-de-casal",
  },
  {
    icon: Lightbulb,
    title: "Autoconhecimento e Entendimento",
    description:
      "Muitas vezes, não sabemos explicar o que sentimos. A avaliação psicológica ajuda a dar nome e sentido para suas angústias, sendo o primeiro passo para a mudança.",
    href: "/autoconhecimento",
  },
  {
    icon: NotebookPen,
    title: "Supervisão para Psicólogos",
    description:
      "Para colegas de profissão, ofereço supervisão clínica em Análise do Comportamento, focada em discussão de casos, ética e aprimoramento técnico com parceira.",
    href: "/supervisao",
  },
];

export function Services() {
  const { getElapsedTime } = useTimeToAction();

  const handleWhatsAppClick = () => {
    const elapsedTime = getElapsedTime() || 0;

    sendGAEvent('event', 'schedule_click', {
      source: 'services_cta',
      time_to_click_ms: elapsedTime,
    });
  };

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
              <Link key={index} href={service.href} className="block group">
                <Card
                  className="border-slate-200 bg-white hover:shadow-lg transition-all duration-300 h-full group-hover:-translate-y-1"
                >
                  <CardHeader>
                    <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-slate-900 text-lg group-hover:text-red-700 transition-colors">
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <CardDescription className="text-slate-600 mb-6">
                      {service.description}
                    </CardDescription>
                    <div className="flex items-center text-red-600 font-medium group-hover:text-red-700 transition-colors mt-auto">
                      Saiba mais <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* CTA pós-evocação */}
        <div className="mt-16 flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
            onClick={handleWhatsAppClick}
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
