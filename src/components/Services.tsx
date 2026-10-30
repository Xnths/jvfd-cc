"use client"

import { trackWhatsappClick } from "@/lib/whatsapp-lead";
import {
  Brain,
  Users,
  Lightbulb,
  ShieldAlert,
  Armchair,
  NotebookPen,
  Heart,
  ArrowRight,
  GraduationCap,
  type LucideIcon,
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
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import Link from "next/link";
import { services as baseServices } from "@/content/clinic";
import { tutoring } from "@/content/tutoring";
import { sendGAEvent } from "@next/third-parties/google";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { useEdit } from "@/edit/EditContext";
import { iconFor } from "@/lib/service-icons";
import { Editable } from "@/edit/Editable";


const ICONS: Record<string, LucideIcon> = {
  "/psicoterapia": Brain,
  "/foco-organizacao": Users,
  "/plantao": ShieldAlert,
  "/terapia-de-casal": Armchair,
  "/autoconhecimento": Lightbulb,
  "/supervisao": NotebookPen,
  "/lgbtqia": Heart,
  [tutoring.path]: GraduationCap,
};

// Tutoring is a page in code, not a Postgres service, so its card is always appended.
const tutoringCard = {
  name: tutoring.shortName,
  title: "Aulas de Química, Biologia e método de estudo",
  description:
    "Aulas particulares para ENEM e vestibular, método de estudo baseado em Análise do Comportamento e apoio a estudantes de Psicologia. Um serviço educacional, separado da terapia.",
  href: tutoring.path,
  pride: false,
};

const staticServices = [...baseServices, tutoringCard].map((s) => ({ ...s, showOnHome: ("pride" in s && s.pride ? "campaign" : "always") as "always" | "campaign" | "never" }));

export function Services({ showLgbt = false }: { showLgbt?: boolean }) {
  const whatsappUrl = useWhatsappUrl();
  const { getElapsedTime } = useTimeToAction();
  const { serviceCards } = useEdit();
  const services = (serviceCards ? [...serviceCards, { ...tutoringCard, showOnHome: "always" as const }] : staticServices).map((service) => ({
    ...service,
    icon: ("icon" in service && service.icon ? iconFor(service.icon as string) : ICONS[service.href]) ?? Brain,
  }));

  const handleWhatsAppClick = () => {
    const elapsedTime = getElapsedTime() || 0;

    sendGAEvent('event', 'schedule_click', {
      source: 'services_cta',
      time_to_click_ms: elapsedTime,
    });
    trackWhatsappClick('services_cta');
  };

  return (
    <section className="py-20 bg-slate-50" id="services">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Editable as="h2" k="home.services.title" className="text-slate-900 mb-4 text-3xl">
            Como posso te ajudar?
          </Editable>
          <Editable as="p" k="home.services.intro" className="text-slate-600 max-w-2xl mx-auto text-lg">
            Nem sempre é fácil saber quando procurar ajuda. Dificuldades emocionais, comportamentais ou de relacionamento costumam se acumular aos poucos e começam a pesar em várias áreas da vida. Estas são algumas situações em que o acompanhamento psicológico pode ajudar.
          </Editable>
          {/* LGBTQIA+ friendly badge */}
          {showLgbt && (
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 shadow-sm">
              <span className="flex gap-0.5 items-center">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="w-2 h-2 rounded-full bg-violet-600" />
              </span>
              <Editable k="home.services.lgbt_badge" className="text-sm font-semibold text-violet-700">Psicólogo LGBTQIA+</Editable>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {services.filter((s) => s.showOnHome === "always" || (s.showOnHome === "campaign" && showLgbt)).map((service, index) => {
            const Icon = service.icon;
            const isPride = "pride" in service && service.pride;
            return (
              <Link key={index} href={service.href} className="block group">
                <Card
                  className={`transition-all duration-300 h-full group-hover:-translate-y-1 ${
                    isPride
                      ? "border-violet-200 bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50 hover:shadow-violet-100 hover:shadow-lg"
                      : "border-slate-200 bg-white hover:shadow-lg"
                  }`}
                >
                  {isPride && (
                    <div className="flex h-1 rounded-t-xl overflow-hidden">
                      <div className="flex-1 bg-red-500" />
                      <div className="flex-1 bg-orange-400" />
                      <div className="flex-1 bg-yellow-400" />
                      <div className="flex-1 bg-green-500" />
                      <div className="flex-1 bg-blue-500" />
                      <div className="flex-1 bg-violet-600" />
                    </div>
                  )}
                  <CardHeader>
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300 ${
                        isPride
                          ? "bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white"
                          : "bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle
                      className={`text-lg transition-colors ${
                        isPride
                          ? "text-violet-900 group-hover:text-violet-700"
                          : "text-slate-900 group-hover:text-red-700"
                      }`}
                    >
                      <Editable k={`home.services.${service.href.slice(1)}.title`}>{service.title}</Editable>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <CardDescription className="text-slate-600 mb-6">
                      <Editable k={`home.services.${service.href.slice(1)}.description`}>{service.description}</Editable>
                    </CardDescription>
                    <div
                      className={`flex items-center font-medium transition-colors mt-auto ${
                        isPride
                          ? "text-violet-600 group-hover:text-violet-800"
                          : "text-red-600 group-hover:text-red-700"
                      }`}
                    >
                      <Editable k="home.services.more">Saiba mais</Editable> <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
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
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={handleWhatsAppClick}
          >
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp className="w-5 h-5" />
              <Editable k="home.services.cta">Conversar pelo WhatsApp</Editable>
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

