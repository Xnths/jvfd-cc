"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa";
import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";
import { Editable } from "@/edit/Editable";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { getGclidFromCookie } from "@/lib/gclid";
import { trackWhatsappClick } from "@/lib/whatsapp-lead";

// The WhatsApp CTA of the service pages. Google Ads counts these clicks ("WA – Clique"): keep the
// `schedule_click` event, its params and trackWhatsappClick exactly as they are.

const PHONE = "5511955591996";

export function buildWhatsappUrl(message: string, isMobile: boolean): string {
  const encoded = encodeURIComponent(message);
  if (isMobile) return `https://wa.me/${PHONE}?text=${encoded}`;
  return `https://api.whatsapp.com/send?phone=${PHONE}&text=${encoded}`;
}

/** href (wa.me on mobile, api.whatsapp.com on desktop) and the tracked click handler. */
export function useWhatsappCta(message: string, source: string) {
  const [href, setHref] = useState(() => buildWhatsappUrl(message, true));
  const { getElapsedTime } = useTimeToAction();

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setHref(buildWhatsappUrl(message, isMobile));
  }, [message]);

  const onClick = () => {
    const elapsed = getElapsedTime() ?? 0;
    const gclid = getGclidFromCookie();
    const params = { source, time_to_click_ms: elapsed, ...(gclid ? { gclid } : {}) };
    sendGAEvent("event", "schedule_click", params);
    posthog.capture("schedule_click", params);

    trackWhatsappClick(source);
  };

  return { href, onClick };
}

export function CTAButton({
  href,
  btnClass,
  onClick,
  size = "default",
  className = "",
  marker,
  children,
}: {
  href: string;
  btnClass: string;
  onClick: () => void;
  size?: "default" | "large" | "responsive";
  className?: string;
  /** Sets data-cta="<marker>" (the sticky bar watches "hero" and "closing"). */
  marker?: string;
  children: ReactNode;
}) {
  const sizeClass =
    size === "large" ? "px-8 py-5 text-lg" : size === "responsive" ? "gap-2 px-4 py-4 text-[15px] min-[400px]:text-base md:gap-3 md:px-8 md:py-5 md:text-lg" : "px-5 py-4 text-base sm:px-6";
  const iconClass = size === "large" ? "w-6 h-6" : size === "responsive" ? "w-5 h-5 md:w-6 md:h-6" : "w-5 h-5";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      data-cta={marker}
      // Phones: full width, label centred and balanced when it wraps (a thumb-sized target); natural width from sm up.
      className={`flex w-full items-center justify-center ${size === "responsive" ? "" : "gap-3"} rounded-xl text-center font-semibold leading-snug [text-wrap:balance] transition-all duration-200 shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:inline-flex sm:w-auto sm:text-left ${btnClass} ${sizeClass} ${className}`}
    >
      <FaWhatsapp className={`shrink-0 ${iconClass}`} />
      {children}
    </a>
  );
}

/** Self-contained CTA for server-rendered pages: same href, same tracking as the service page buttons. */
export function WhatsappCtaButton({
  message,
  source,
  textKey,
  text,
  btnClass,
  size = "default",
  marker,
}: {
  message: string;
  source: string;
  textKey: string;
  text: string;
  btnClass: string;
  size?: "default" | "large" | "responsive";
  marker?: string;
}) {
  const { href, onClick } = useWhatsappCta(message, source);
  return (
    <CTAButton href={href} onClick={onClick} btnClass={btnClass} size={size} marker={marker}>
      <Editable k={textKey}>{text}</Editable>
    </CTAButton>
  );
}
