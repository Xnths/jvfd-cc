"use client"

import { whatsappUrl } from "@/lib/constant";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { sendGAEvent } from "@next/third-parties/google";
import Image from "next/image";

export function Hero() {
  const { getElapsedTime } = useTimeToAction();

  const handleClick = () => {
    const elapsedTime = getElapsedTime() || 0;

    sendGAEvent('event', 'schedule_click', {
      source: 'hero_cta',
      time_to_click_ms: elapsedTime,
    });
  };

  return (
    <section className="relative h-screen min-h-[700px] flex items-center z-50" id="hero">
      <div className="absolute inset-0 z-0">
        <Image
          width={1920}
          height={1080}
          src="/consultorio.png"
          alt="Ambiente clínico para atendimento psicológico na Vila Madalena"
          className="w-full h-full object-cover"
          priority
        />
        {/* Overlay levemente mais escuro para garantir contraste no texto */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl">
          {/* Tag de Especialidade para Autoridade Imediata */}
          <span className="text-red-400 font-semibold tracking-widest uppercase text-sm mb-4 block">
            Análise do Comportamento • Prática Baseada em Evidências
          </span>

          <h1 className="text-white mb-6 text-5xl md:text-6xl lg:text-7xl font-light leading-tight">
            Desenvolva <strong className="font-bold text-white">Autonomia</strong> e <br />
            Novos <strong className="font-bold text-white">Repertórios</strong> de Vida
          </h1>

          <p className="text-slate-300 mb-10 text-xl md:text-2xl leading-relaxed max-w-2xl">
            Atendimento especializado para adultos com o psicólogo <strong>João Fernandes</strong>.
            Estratégias clínicas fundamentadas na ciência para promover mudanças funcionais e sustentáveis.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Botão Principal - Conversão Direta */}
            <a
              href={whatsappUrl}
              onClick={handleClick}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-md text-lg font-bold transition-all text-center shadow-lg hover:shadow-red-500/20"
              target="_blank"
              rel="noopener noreferrer"
            >
              Agendar Consulta Particular
            </a>

            {/* Botão Secundário - Autoridade Local */}
            <div className="flex items-center px-4 text-slate-400 border-l border-slate-700 ml-0 sm:ml-4">
              <span className="text-sm">
                Vila Madalena, SP <br />
                & Atendimento Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}