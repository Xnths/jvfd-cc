"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { FaWhatsapp } from "react-icons/fa";
import { sendGAEvent } from "@next/third-parties/google";
import posthog from "posthog-js";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { getGclidFromCookie } from "@/lib/gclid";

const PHONE = "5511955591996";
const MESSAGE = encodeURIComponent("Olá, gostaria de saber mais sobre o atendimento presencial.");
const FALLBACK_URL = `https://wa.me/${PHONE}?text=${MESSAGE}`;

export function HeroPresencial() {
  const [whatsappUrl, setWhatsappUrl] = useState(FALLBACK_URL);
  const { getElapsedTime } = useTimeToAction();

  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    if (!isMobile) {
      setWhatsappUrl(`https://api.whatsapp.com/send?phone=${PHONE}&text=${MESSAGE}`);
    }
  }, []);

  const handleClick = () => {
    const elapsedTime = getElapsedTime() ?? 0;
    const gclid = getGclidFromCookie();

    sendGAEvent("event", "schedule_click", {
      source: "presencial_hero",
      time_to_click_ms: elapsedTime,
      ...(gclid ? { gclid } : {}),
    });
    posthog.capture("schedule_click", {
      source: "presencial_hero",
      time_to_click_ms: elapsedTime,
      ...(gclid ? { gclid } : {}),
    });

    if (gclid) {
      const data = JSON.stringify({ gclid });
      const sent = navigator.sendBeacon
        ? navigator.sendBeacon("/api/leads", new Blob([data], { type: "application/json" }))
        : false;
      if (!sent) {
        fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: data,
          keepalive: true,
        }).catch(() => {});
      }
    }
  };

  return (
    <>
      {/* Hero */}
      <section
        className="relative h-svh flex items-center pb-24 md:pb-0"
        id="hero"
      >
        <div className="absolute inset-0 z-0">
          <Image
            fill
            src="/consultorio.jpg"
            alt="Consultório do psicólogo João Fernandes em Vila Madelena"
            className="w-full h-full object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-transparent" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <span className="text-red-400 font-semibold tracking-widest uppercase text-sm mb-4 block">
              Atendimento Presencial — Vila Madelena
            </span>
            <h1 className="text-white mb-6 text-4xl md:text-6xl font-bold leading-tight">
              Atendimento Psicológico Presencial em Vila Madelena
            </h1>
            <p className="text-slate-200 mb-10 text-lg md:text-xl leading-relaxed max-w-2xl">
              Espaço dedicado ao equilíbrio emocional e autoconhecimento
            </p>

            {/* Desktop CTA */}
            <a
              href={whatsappUrl}
              onClick={handleClick}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-md text-lg font-bold transition-all shadow-lg"
            >
              <FaWhatsapp className="w-6 h-6" />
              Entrar em contato pelo WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
