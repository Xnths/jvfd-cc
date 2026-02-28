"use client"

import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { sendGAEvent } from "@next/third-parties/google";
import { getGclidFromCookie } from "@/lib/gclid";
import Image from "next/image";
import { FaWhatsapp } from "react-icons/fa";
import { ContactForm } from "./ContactForm";

export function Hero() {
  const whatsappUrl = useWhatsappUrl();
  const { getElapsedTime } = useTimeToAction();

  const handleClick = () => {
    const elapsedTime = getElapsedTime() || 0;
    sendGAEvent('event', 'schedule_click', {
      source: 'hero_cta',
      time_to_click_ms: elapsedTime,
    });

    // Fire GCLID lead — fire-and-forget via sendBeacon (survives page unload)
    const gclid = getGclidFromCookie();
    if (gclid) {
      const data = JSON.stringify({ gclid });
      const sent = navigator.sendBeacon
        ? navigator.sendBeacon('/api/leads', new Blob([data], { type: 'application/json' }))
        : false;
      if (!sent) {
        // Fallback for browsers without sendBeacon
        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true,
        }).catch(() => { });
      }
    }
  };


  return (
    <section className="relative h-screen min-h-[700px] flex items-center z-50" id="hero">
      <div className="absolute inset-0 z-0">
        <Image
          fill
          src="/consultorio.jpg"
          alt="Ambiente clínico para atendimento psicológico na Vila Madalena"
          className="w-full h-full object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl">
          <span className="text-red-400 font-semibold tracking-widest uppercase text-sm mb-4 block">
            João Fernandes
            <br />
            CRP 06/157908
          </span>

          <h1 className="text-white mb-6 text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Você não precisa resolver
            <br />
            tudo de uma vez.
          </h1>

          <p className="text-slate-200 mb-10 text-lg md:text-2xl leading-relaxed max-w-2xl">
            Com a terapia, podemos trabalhar juntos para entender o que está te travando e encontrar caminhos mais leves.
          </p>

          <div className="flex flex-col gap-4 w-full md:w-fit">
            <a
              href={whatsappUrl}
              onClick={handleClick}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-md text-lg font-bold transition-all text-center shadow-lg hover:shadow-green-500/20 inline-flex items-center justify-center gap-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp className="w-6 h-6" />
              Conversar com o João
            </a>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-600"></div>
              <span className="text-slate-400 text-sm">ou</span>
              <div className="flex-1 h-px bg-slate-600"></div>
            </div>

            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}