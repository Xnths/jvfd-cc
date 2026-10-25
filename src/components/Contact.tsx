"use client"

import { MapPin } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import Link from "next/link";
import { links } from "@/content/clinic";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { sendGAEvent } from "@next/third-parties/google";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import posthog from "posthog-js";
import { Editable } from "@/edit/Editable";


export function Contact() {
  const whatsappUrl = useWhatsappUrl();
  const { getElapsedTime } = useTimeToAction();

  const contactInfo = [
    {
      icon: FaWhatsapp,
      title: "WhatsApp",
      details: "+55 (11) 95559-1996",
      url: whatsappUrl,
      type: "whatsapp"
    },
    {
      icon: FaInstagram,
      title: "Instagram",
      details: "@ciencia_comportamental_",
      url: "https://www.instagram.com/ciencia_comportamental_/",
      type: "instagram"
    },
    {
      icon: MapPin,
      title: "Endereço do consultório",
      details: "Rua Harmonia, 1323 - Vila Madalena, São Paulo - SP, 05435-001",
      url: links.googleProfile,
      type: "map"
    },
  ];

  const handleContactClick = (type: string) => {
    if (type === 'whatsapp') {
      const elapsedTime = getElapsedTime() || 0;
      sendGAEvent('event', 'schedule_click', {
        source: 'contact_card',
        time_to_click_ms: elapsedTime,
      });
      posthog.capture('schedule_click', {
        source: 'contact_card',
        time_to_click_ms: elapsedTime,
      });
    }
  };


  return (
    <section id="contact" className="py-20 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Editable as="h2" k="home.contact.title" className="text-slate-900 mb-4 text-2xl">Contato</Editable>
          <Editable as="p" k="home.contact.subtitle" className="text-slate-600 max-w-2xl mx-auto text-lg">
            Entre em contato com o profissional
          </Editable>
        </div>

        <div className="gap-12 max-w-6xl mx-auto flex flex-col md:flex-row justify-center items-center">
          <div className="space-y-6">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <Card key={index} className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <Link
                      href={info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleContactClick(info.type)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <Editable as="h3" k={`home.contact.${info.type}.title`} className="text-slate-900 mb-1">{info.title}</Editable>
                          <p className="text-slate-600">{info.details}</p>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section >
  );
}