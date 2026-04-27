"use client";

import { useState, useEffect } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { sendGAEvent } from "@next/third-parties/google";
import posthog from "posthog-js";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { getGclidFromCookie } from "@/lib/gclid";

const PHONE = "5511955591996";
const MESSAGE = encodeURIComponent("Olá, gostaria de saber mais sobre o atendimento presencial.");
const FALLBACK_URL = `https://wa.me/${PHONE}?text=${MESSAGE}`;

export function CTAPresencial() {
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
      source: "presencial_cta",
      time_to_click_ms: elapsedTime,
      ...(gclid ? { gclid } : {}),
    });
    posthog.capture("schedule_click", {
      source: "presencial_cta",
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
    <section className="py-20 bg-slate-900" id="contato">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-4">
            Iniciar o processo terapêutico
          </h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            O primeiro contato pode ser feito pelo WhatsApp. Respondemos em até 2h em dias úteis.
          </p>

          <a
            href={whatsappUrl}
            onClick={handleClick}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-md text-lg font-bold transition-all shadow-lg mb-8"
          >
            <FaWhatsapp className="w-6 h-6" />
            Entrar em contato pelo WhatsApp
          </a>

          <div className="mt-8 border-t border-slate-700 pt-8 text-slate-400 text-sm space-y-1">
            <p className="font-semibold text-slate-300">Horários de atendimento</p>
            <p>Segunda a sexta: 8h às 21h</p>
            <p className="mt-3 text-slate-500">Atendimento presencial em Vila Madelena, São Paulo</p>
          </div>
        </div>
      </div>
    </section>
  );
}
