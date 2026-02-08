"use client"

import { MapPin } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { whatsappUrl } from "@/lib/constant";
import Link from "next/link";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";


const contactInfo = [
  {
    icon: FaWhatsapp,
    title: "WhatsApp",
    details: "+55 (11) 95559-1996",
    url: whatsappUrl
  },
  {
    icon: FaInstagram,
    title: "Instagram",
    details: "@ciencia_comportamental_",
    url: "https://www.instagram.com/ciencia_comportamental_/",
  },
  {
    icon: MapPin,
    title: "Endereço do consultório",
    details: "Rua Harmonia, 1323 - Vila Madalena, São Paulo - SP, 05435-001",
    url: "https://www.google.com/maps/place/Rua+Harmonia,+1323+-+Vila+Madalena,+S%C3%A3o+Paulo+-+SP,+05435-001/@-23.5666667,-46.6666667,17z/data=!3m1!4b1!4m5!3m4!1s0x94ce59f1b3b3b3b3:0x94ce59f1b3b3b3b3!8m2!3d-23.5666667!4d-46.6666667",
  },
];

export function Contact() {


  return (
    <section id="contact" className="py-20 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 mb-4 text-2xl">Contato</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Entre em contato com o profissional
          </p>
        </div>

        <div className="gap-12 max-w-6xl mx-auto flex flex-col md:flex-row justify-center items-center">
          <div className="space-y-6">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <Card key={index} className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <Link href={info.url} target="_blank" rel="noopener noreferrer">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-slate-900 mb-1">{info.title}</h3>
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