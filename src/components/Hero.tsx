"use client"

import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import Link from "next/link";
import { Info } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { whatsappUrl } from "@/lib/constant";

export function Hero() {
  const scrollToContact = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-screen min-h-[600px] flex items-center">
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="consultorio.jpg"
          alt="Ambiente clínico para atendimento psicológico"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/60"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-white mb-6 text-5xl md:text-6xl lg:text-7xl leading-tight">
            Consultório Psicológico
            <br />
            <strong className="text-red-600">
              João Fernandes
            </strong>
          </h1>
          <p className="text-slate-300 mb-10 text-xl md:text-2xl leading-relaxed max-w-2xl">
            {/* Atendimentos Psicológicos e Psicoterapêuticos de Excelência, com ênfase tanto no bem estar dos pacientes ao longo do processo, quanto na comprovação científica dos métodos e técnicas utilizadas. */}
            Atendimentos Psicológicos e Psicoterapêuticos de Excelência, com ênfase tanto no bem estar dos pacientes ao longo do processo, quanto na comprovação científica dos métodos e técnicas utilizadas.
          </p>
        </div>
      </div>
    </section>
  );
}
