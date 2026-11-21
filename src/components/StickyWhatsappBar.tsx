"use client";

import { useEffect, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { Editable } from "@/edit/Editable";
import { useWhatsappCta } from "@/components/WhatsappCta";

// WhatsApp CTA that follows the reader: a full-width bottom bar on phones, a pill at the bottom right from md up.
// It shows once the hero CTA (data-cta="hero") has scrolled away and hides while the closing CTA (data-cta="closing")
// is on screen, so two buttons never compete. Same href and tracking as every other CTA (useWhatsappCta).

function useStickyVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = document.querySelector('[data-cta="hero"]');
      const closing = document.querySelector('[data-cta="closing"]');
      const heroPassed = hero ? hero.getBoundingClientRect().bottom < 0 : window.scrollY > 600;
      const r = closing?.getBoundingClientRect();
      const closingOnScreen = !!r && r.top < window.innerHeight && r.bottom > 0;
      setVisible(heroPassed && !closingOnScreen);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return visible;
}

export function StickyCtaBar({
  href,
  onClick,
  text,
  textKey,
  note,
  noteKey,
  btnClass,
}: {
  href: string;
  onClick: () => void;
  text: string;
  textKey: string;
  note: string;
  noteKey: string;
  btnClass: string;
}) {
  const visible = useStickyVisible();
  const barRef = useRef<HTMLDivElement>(null);
  // The footer pads its bottom by --bottom-ui-h on phones (globals.css), so the bar never covers its last line and
  // no empty band shows below it. The bar sets its measured height (label wrapping, safe area included).
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => root.style.setProperty("--bottom-ui-h", `${Math.ceil(el.getBoundingClientRect().height)}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--bottom-ui-h");
    };
  }, []);
  return (
    <>
      <div
        ref={barRef}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 md:inset-x-auto md:right-6 md:bottom-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none ${
          visible ? "translate-y-0" : "translate-y-[150%] pointer-events-none"
        }`}
        aria-hidden={!visible}
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          tabIndex={visible ? 0 : -1}
          data-cta="sticky"
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold leading-tight min-[400px]:text-base shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:w-auto md:rounded-full md:px-6 md:shadow-lg ${btnClass}`}
        >
          <FaWhatsapp className="h-5 w-5 shrink-0" aria-hidden />
          <Editable k={textKey}>{text}</Editable>
        </a>
        <p className="mt-1 text-center text-xs text-slate-600 md:hidden">
          <Editable k={noteKey}>{note}</Editable>
        </p>
      </div>
    </>
  );
}

/** For server pages: builds the tracked href itself. */
export function StickyWhatsappBar({ message, source, ...rest }: { message: string; source: string } & Omit<Parameters<typeof StickyCtaBar>[0], "href" | "onClick">) {
  const { href, onClick } = useWhatsappCta(message, source);
  return <StickyCtaBar href={href} onClick={onClick} {...rest} />;
}
