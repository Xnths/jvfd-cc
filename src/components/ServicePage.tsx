"use client";

import { trackWhatsappClick } from "@/lib/whatsapp-lead";
import { createContext, useContext, useEffect, useState } from "react";
import { Editable } from "@/edit/Editable";
import dynamic from "next/dynamic";
import { useEdit } from "@/edit/EditContext";
import type { ServiceInfo } from "@/lib/queries";
import { SERVICE_THEMES, type ServiceTheme } from "@/lib/service-themes";
import { FaWhatsapp } from "react-icons/fa";
import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { getGclidFromCookie } from "@/lib/gclid";
import { RichText } from "@/components/RichText";
import { Footer } from "@/components/Footer";
import { Contact } from "@/components/Contact";

// Copy on a service page is keyed `service.<slug>.<name>`, so each service edits its own text inline.
type ServiceCtxValue = { slug: string; serviceId?: string; pageId?: string; showContact: boolean };
const ServiceCtx = createContext<ServiceCtxValue>({ slug: "", showContact: true });
function SE({ k, as, className, multiline, children }: { k: string; as?: React.ElementType; className?: string; multiline?: boolean; children: string }) {
  const { slug } = useContext(ServiceCtx);
  return (
    <Editable k={`service.${slug}.${k}`} as={as} className={className} multiline={multiline}>
      {children}
    </Editable>
  );
}

// ─── Per-service config ─────────────────────────────────────────────────────

const PHONE = "5511955591996";

type Variant = "calming" | "structured" | "plantao" | "supervisao" | "exploratory" | "affirmative";

interface ServiceConfig {
  ctaText: string;
  whatsappMessage: string;
  variant: Variant;
  // Hero palette (full Tailwind class strings — no dynamic construction)
  heroBg: string;
  heroHeadingClass: string;
  heroSubtitleClass: string;
  // Accent / CTA button
  ctaBtnClass: string;
  accentTextClass: string;
  // Decorative badge above the title
  badge?: string;
}

const SERVICE_CONFIG: Record<string, ServiceConfig> = {
  psicoterapia: {
    ctaText: "Agende uma primeira conversa",
    whatsappMessage:
      "Olá! Gostaria de agendar uma primeira conversa. Vi o site e gostaria de saber mais.",
    variant: "calming",
    heroBg: "bg-teal-50",
    heroHeadingClass: "text-teal-900",
    heroSubtitleClass: "text-teal-700",
    ctaBtnClass: "bg-teal-700 hover:bg-teal-800 text-white focus-visible:ring-teal-500",
    accentTextClass: "text-teal-700",
    badge: "Psicoterapia Individual",
  },
  "foco-organizacao": {
    ctaText: "Recupere o controle da sua rotina",
    whatsappMessage:
      "Olá! Gostaria de saber mais sobre o atendimento para foco e organização.",
    variant: "structured",
    heroBg: "bg-white",
    heroHeadingClass: "text-slate-900",
    heroSubtitleClass: "text-slate-600",
    ctaBtnClass: "bg-slate-900 hover:bg-slate-700 text-white focus-visible:ring-slate-500",
    accentTextClass: "text-slate-700",
    badge: "Foco & Organização",
  },
  plantao: {
    ctaText: "Fale comigo agora pelo WhatsApp",
    whatsappMessage:
      "Olá! Estou passando por um momento difícil e preciso de ajuda.",
    variant: "plantao",
    heroBg: "bg-white",
    heroHeadingClass: "text-slate-900",
    heroSubtitleClass: "text-slate-600",
    ctaBtnClass: "bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-500",
    accentTextClass: "text-green-700",
    badge: "Plantão Psicológico",
  },
  "terapia-de-casal": {
    ctaText: "Agende uma sessão para vocês",
    whatsappMessage:
      "Olá! Gostaria de agendar uma sessão de terapia de casal.",
    variant: "calming",
    heroBg: "bg-amber-50",
    heroHeadingClass: "text-amber-900",
    heroSubtitleClass: "text-amber-800",
    ctaBtnClass: "bg-amber-700 hover:bg-amber-800 text-white focus-visible:ring-amber-500",
    accentTextClass: "text-amber-700",
    badge: "Terapia de Casal",
  },
  autoconhecimento: {
    ctaText: "Inicie sua jornada de autodescoberta",
    whatsappMessage:
      "Olá! Gostaria de começar um processo de autoconhecimento. Vi o site e quero saber mais.",
    variant: "exploratory",
    heroBg: "bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50",
    heroHeadingClass: "text-stone-900",
    heroSubtitleClass: "text-stone-600",
    ctaBtnClass: "bg-stone-800 hover:bg-stone-700 text-white focus-visible:ring-stone-500",
    accentTextClass: "text-stone-700",
    badge: "Autoconhecimento",
  },
  supervisao: {
    ctaText: "Solicite informações sobre a supervisão",
    whatsappMessage:
      "Olá! Sou psicólogo(a) e gostaria de solicitar informações sobre a supervisão clínica.",
    variant: "supervisao",
    heroBg: "bg-slate-900",
    heroHeadingClass: "text-white",
    heroSubtitleClass: "text-slate-300",
    ctaBtnClass: "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500",
    accentTextClass: "text-red-400",
    badge: "Supervisão Clínica",
  },
  lgbtqia: {
    ctaText: "Agendar uma conversa",
    whatsappMessage:
      "Olá! Gostaria de agendar uma sessão com o João. Vi o site e me interessei pelo atendimento LGBTQIA+.",
    variant: "affirmative",
    heroBg: "bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50",
    heroHeadingClass: "text-violet-900",
    heroSubtitleClass: "text-violet-700",
    ctaBtnClass: "bg-violet-700 hover:bg-violet-800 text-white focus-visible:ring-violet-500",
    accentTextClass: "text-violet-600",
    badge: "Psicólogo LGBTQIA+",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function ServiceContact() {
  return useContext(ServiceCtx).showContact ? <Contact /> : null;
}

// The rich-text body; while an admin is editing it becomes the editor, in the same place on the page.
const ServiceBodyEditor = dynamic(() => import("@/edit/ServiceBodyEditor").then((m) => m.ServiceBodyEditor), { ssr: false });
function ServiceBody({ content }: { content: unknown }) {
  const { editing } = useEdit();
  const { serviceId, pageId } = useContext(ServiceCtx);
  if (editing && serviceId && pageId) return <ServiceBodyEditor serviceId={serviceId} pageId={pageId} />;
  return <RichText content={content} />;
}

function buildWhatsappUrl(message: string, isMobile: boolean): string {
  const encoded = encodeURIComponent(message);
  if (isMobile) return `https://wa.me/${PHONE}?text=${encoded}`;
  return `https://api.whatsapp.com/send?phone=${PHONE}&text=${encoded}`;
}

// ─── Shared chrome ──────────────────────────────────────────────────────────

function CTAButton({
  href,
  btnClass,
  text,
  onClick,
  size = "default",
}: {
  href: string;
  btnClass: string;
  text: string;
  onClick: () => void;
  size?: "default" | "large";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`inline-flex items-center gap-3 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${btnClass} ${
        size === "large"
          ? "px-8 py-5 text-lg"
          : "px-6 py-4 text-base"
      }`}
    >
      <FaWhatsapp className={size === "large" ? "w-6 h-6" : "w-5 h-5"} />
      <SE k="cta">{text}</SE>
    </a>
  );
}

// ─── Layout: Calming (psicoterapia, terapia-de-casal) ───────────────────────
// Research: warm/neutral environments lower perceived threat and
// increase help-seeking intention. Low-commitment CTA copy reduces
// decision friction (Corrigan et al., 2014 on stigma-reduction framing).

function CalmingLayout({
  title,
  subtitle,
  content,
  whatsappUrl,
  onCTAClick,
  config,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero — spacious, airy, validating */}
      <section className={`pt-20 pb-24 px-4 ${config.heroBg}`}>
        <div className="container mx-auto max-w-3xl text-center">
          {config.badge && (
            <span
              className={`inline-block text-sm font-semibold uppercase tracking-widest mb-4 ${config.accentTextClass}`}
            >
              <SE k="badge">{config.badge}</SE>
            </span>
          )}
          <h1
            className={`text-4xl md:text-5xl font-bold leading-tight mb-6 ${config.heroHeadingClass}`}
          >
            <SE k="title">{title}</SE>
          </h1>
          {subtitle && (
            <p
              className={`text-xl md:text-2xl leading-relaxed font-light max-w-2xl mx-auto ${config.heroSubtitleClass}`}
            >
              <SE k="subtitle" multiline>{subtitle}</SE>
            </p>
          )}
          {/* Immediate low-friction CTA in the hero */}
          <div className="mt-10 flex justify-center">
            <CTAButton
              href={whatsappUrl}
              btnClass={config.ctaBtnClass}
              text={config.ctaText}
              onClick={onCTAClick}
            />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            <SE k="hero_note">Sem compromissos. Apenas uma conversa.</SE>
          </p>
        </div>
      </section>

      {/* Rich content */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-2xl text-lg text-slate-700 leading-relaxed">
          <ServiceBody content={content} />
        </div>
      </section>

      {/* CTA before footer */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="container mx-auto max-w-2xl text-center">
          <p className={`text-sm font-semibold uppercase tracking-widest mb-3 ${config.accentTextClass}`}>
            <SE k="closing_eyebrow">Próximo passo</SE>
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
            <SE k="closing_heading">Você não precisa ter certeza para começar.</SE>
          </h2>
          <CTAButton
            href={whatsappUrl}
            btnClass={config.ctaBtnClass}
            text={config.ctaText}
            onClick={onCTAClick}
          />
        </div>
      </section>

      <ServiceContact />
      <Footer />
    </div>
  );
}

// ─── Layout: Structured (foco-organizacao) ──────────────────────────────────
// Research: structured, predictable layouts signal control and competence —
// mirroring the mental state the user is seeking (Tversky, 2011 on spatial
// cognition and cognitive load reduction).

function StructuredLayout({
  title,
  subtitle,
  content,
  whatsappUrl,
  onCTAClick,
  config,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero — stark, left-aligned, no-nonsense */}
      <section className="pt-20 pb-20 px-4 border-b border-slate-200">
        <div className="container mx-auto max-w-4xl">
          {config.badge && (
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
              <SE k="badge">{config.badge}</SE>
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight max-w-2xl mb-6">
            <SE k="title">{title}</SE>
          </h1>
          {subtitle && (
            <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
              <SE k="subtitle" multiline>{subtitle}</SE>
            </p>
          )}
          <div className="mt-8">
            <CTAButton
              href={whatsappUrl}
              btnClass={config.ctaBtnClass}
              text={config.ctaText}
              onClick={onCTAClick}
            />
          </div>
        </div>
      </section>

      {/* Content — structured blocks */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Main content — 2/3 */}
            <div className="md:col-span-2 text-base text-slate-700 leading-relaxed space-y-0">
              <ServiceBody content={content} />
            </div>
            {/* Sidebar — 1/3 */}
            <aside className="space-y-6">
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 sticky top-28">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                  <SE k="sidebar_eyebrow">Próximo passo</SE>
                </p>
                <p className="text-slate-800 font-semibold mb-5 leading-snug">
                  <SE k="sidebar_text" multiline>Estratégias práticas que respeitam o seu ritmo.</SE>
                </p>
                <CTAButton
                  href={whatsappUrl}
                  btnClass={config.ctaBtnClass}
                  text={config.ctaText}
                  onClick={onCTAClick}
                />
                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  <SE k="sidebar_note">Atendimento presencial em Vila Madalena ou online.</SE>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <ServiceContact />
      <Footer />
    </div>
  );
}

// ─── Layout: Plantão (crisis, urgency) ──────────────────────────────────────
// Crisis intervention literature is clear: every additional element on a
// crisis page is a barrier. The contact action must be the most salient
// object above the fold (Jobes, 2016; National Suicide Prevention guidelines).
// No Contact section — it duplicates the single action and adds friction.

function PlantaoLayout({
  title,
  subtitle,
  content,
  whatsappUrl,
  onCTAClick,
  config,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">

      {/* Full-viewport hero — CTA visible without scrolling */}
      <section className="min-h-[80svh] flex flex-col items-center justify-center px-4 text-center">
        {config.badge && (
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
            <SE k="badge">{config.badge}</SE>
          </span>
        )}
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight max-w-2xl mb-4">
          <SE k="title">{title}</SE>
        </h1>
        {subtitle && (
          <p className="text-xl text-slate-600 max-w-xl leading-relaxed mb-8">
            <SE k="subtitle" multiline>{subtitle}</SE>
          </p>
        )}
        <p className="text-slate-700 text-lg font-medium mb-8 max-w-md">
          <SE k="hero_reassurance">Você não precisa passar por isso sozinho hoje.</SE>
        </p>

        {/* The dominant action — large, green, impossible to miss */}
        <CTAButton
          href={whatsappUrl}
          btnClass={config.ctaBtnClass}
          text={config.ctaText}
          onClick={onCTAClick}
          size="large"
        />
        <p className="mt-5 text-sm text-slate-500">
          <SE k="hero_note">Resposta rápida. Sem julgamentos.</SE>
        </p>
      </section>

      {/* Secondary content — only for users who scroll */}
      {content && (
        <section className="py-16 px-4 border-t border-slate-100">
          <div className="container mx-auto max-w-xl text-slate-700 leading-relaxed">
            <ServiceBody content={content} />
          </div>
          {/* Repeat CTA at end for scrollers */}
          <div className="mt-12 flex justify-center">
            <CTAButton
              href={whatsappUrl}
              btnClass={config.ctaBtnClass}
              text={config.ctaText}
              onClick={onCTAClick}
              size="large"
            />
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

// ─── Layout: Exploratory (autoconhecimento) ─────────────────────────────────
// Self-discovery seekers have a higher tolerance for information depth and
// are motivated by the prospect of meaning-making (Ryan & Deci, 2000 on
// intrinsic motivation). The layout should reward slow, thoughtful reading.

function ExploratoryLayout({
  title,
  subtitle,
  content,
  whatsappUrl,
  onCTAClick,
  config,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero — gradient, reflective, meditative */}
      <section className={`pt-24 pb-28 px-4 ${config.heroBg}`}>
        <div className="container mx-auto max-w-3xl text-center">
          {config.badge && (
            <span
              className={`inline-block text-sm font-semibold uppercase tracking-widest mb-5 ${config.accentTextClass}`}
            >
              <SE k="badge">{config.badge}</SE>
            </span>
          )}
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8 ${config.heroHeadingClass}`}
          >
            <SE k="title">{title}</SE>
          </h1>
          {subtitle && (
            <p
              className={`text-xl md:text-2xl leading-relaxed font-light ${config.heroSubtitleClass}`}
            >
              <SE k="subtitle" multiline>{subtitle}</SE>
            </p>
          )}
        </div>
      </section>

      {/* Spacious content — invites deep reading */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-2xl text-xl text-stone-700 leading-[1.9]">
          <ServiceBody content={content} />
        </div>
      </section>

      {/* Reflective CTA section */}
      <section className="py-20 px-4 bg-gradient-to-r from-amber-50 to-stone-50">
        <div className="container mx-auto max-w-2xl text-center">
          <p className="text-stone-500 text-sm uppercase tracking-widest font-semibold mb-4">
            <SE k="closing_eyebrow">Quando estiver pronto</SE>
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-3">
            <SE k="closing_heading">Dar nome ao que se sente é o primeiro passo.</SE>
          </h2>
          <p className="text-stone-600 mb-8 text-lg">
            <SE k="closing_text">Não há urgência. Há um espaço esperando por você.</SE>
          </p>
          <CTAButton
            href={whatsappUrl}
            btnClass={config.ctaBtnClass}
            text={config.ctaText}
            onClick={onCTAClick}
          />
        </div>
      </section>

      <ServiceContact />
      <Footer />
    </div>
  );
}

// ─── Layout: Supervisão (B2B, clinical authority) ───────────────────────────
// B2B mental health services convert on authority signals: credentials,
// methodology names, and peer alignment (Cialdini, 2001 on authority and
// social proof). Emotional warmth is secondary; technical confidence is primary.

function SupervisaoLayout({
  title,
  subtitle,
  content,
  whatsappUrl,
  onCTAClick,
  config,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero — dark, authoritative */}
      <section className="pt-20 pb-24 px-4 bg-slate-900">
        <div className="container mx-auto max-w-4xl">
          {config.badge && (
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-red-400 mb-6">
              <SE k="badge">{config.badge}</SE>
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight max-w-2xl mb-6">
            <SE k="title">{title}</SE>
          </h1>
          {subtitle && (
            <p className="text-xl text-slate-300 max-w-xl leading-relaxed mb-10 font-light">
              <SE k="subtitle" multiline>{subtitle}</SE>
            </p>
          )}
          <CTAButton
            href={whatsappUrl}
            btnClass={config.ctaBtnClass}
            text={config.ctaText}
            onClick={onCTAClick}
          />
        </div>
      </section>

      {/* Methodology strip */}
      <div className="bg-slate-800 py-5 px-4">
        <div className="container mx-auto max-w-4xl flex flex-wrap gap-x-8 gap-y-2 items-center">
          {["Análise do Comportamento Aplicada", "Discussão de Casos Clínicos", "Fundamentação Científica", "Ética Profissional"].map(
            (tag, ti) => (
              <span
                key={tag}
                className="text-sm text-slate-300 font-medium before:content-['—'] before:text-red-500 before:mr-2"
              >
                <SE k={`method_tag_${ti}`}>{tag}</SE>
              </span>
            )
          )}
        </div>
      </div>

      {/* Content — clinical, structured */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-10">
            <div className="md:col-span-2 text-base text-slate-700 leading-relaxed">
              <ServiceBody content={content} />
            </div>
            <aside className="space-y-6">
              <div className="border border-slate-200 rounded-2xl p-6 sticky top-28">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                  <SE k="sidebar_eyebrow">Para psicólogos</SE>
                </p>
                <p className="text-slate-800 font-semibold mb-5 leading-snug text-sm">
                  <SE k="sidebar_text" multiline>Supervisão clínica em Análise do Comportamento com foco em aprimoramento técnico e ética.</SE>
                </p>
                <CTAButton
                  href={whatsappUrl}
                  btnClass={config.ctaBtnClass}
                  text={config.ctaText}
                  onClick={onCTAClick}
                />
                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  <SE k="sidebar_note">Atendimento presencial em Vila Madalena ou online.</SE>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <ServiceContact />
      <Footer />
    </div>
  );
}

// ─── Layout: Affirmative (lgbtqia+) ─────────────────────────────────────────
// Affirmative therapy research shows that explicit safe-space signaling
// significantly lowers help-seeking barriers for LGBTQIA+ individuals
// (Craig & Austin, 2016). Visibility of identity acceptance before any
// clinical framing reduces threat response and increases engagement.

function RainbowBar({ thin = false }: { thin?: boolean }) {
  return (
    <div className={`flex w-full ${thin ? "h-1" : "h-1.5"}`}>
      <div className="flex-1 bg-red-500" />
      <div className="flex-1 bg-orange-400" />
      <div className="flex-1 bg-yellow-400" />
      <div className="flex-1 bg-green-500" />
      <div className="flex-1 bg-blue-500" />
      <div className="flex-1 bg-violet-600" />
    </div>
  );
}

function AffirmativeLayout({
  title,
  subtitle,
  content,
  whatsappUrl,
  onCTAClick,
  config,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">

      {/* Rainbow accent below the nav */}
      <div className="sticky top-16 left-0 w-full z-40">
        <RainbowBar />
      </div>

      {/* Hero — warm, identity-affirming */}
      <section className={`pt-28 pb-28 px-4 ${config.heroBg}`}>
        <div className="container mx-auto max-w-3xl text-center">
          {config.badge && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest mb-5 text-violet-600">
              <span className="inline-flex gap-0.5 items-center">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="w-2 h-2 rounded-full bg-violet-600" />
              </span>
              <SE k="badge">{config.badge}</SE>
            </span>
          )}
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8 ${config.heroHeadingClass}`}
          >
            <SE k="title">{title}</SE>
          </h1>
          {subtitle && (
            <p
              className={`text-xl md:text-2xl leading-relaxed font-light mb-10 ${config.heroSubtitleClass}`}
            >
              <SE k="subtitle" multiline>{subtitle}</SE>
            </p>
          )}
          <CTAButton
            href={whatsappUrl}
            btnClass={config.ctaBtnClass}
            text={config.ctaText}
            onClick={onCTAClick}
          />
          <p className="mt-5 text-sm text-slate-500">
            <SE k="hero_note">Um psicólogo gay que entende sua história. Aqui, você é livre para ser quem é.</SE>
          </p>
        </div>
      </section>

      {/* Identity-affirming trust strip */}
      <div className="py-6 px-4 bg-white border-y border-slate-100">
        <div className="container mx-auto max-w-3xl flex flex-wrap justify-center gap-x-8 gap-y-2">
          {[
            "Identidade celebrada",
            "Relacionamentos mais plenos",
            "Aceitação e leveza",
            "Sigilo absoluto",
          ].map((tag, ti) => (
            <span
              key={tag}
              className="text-sm text-slate-600 font-medium flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <SE k={`trust_tag_${ti}`}>{tag}</SE>
            </span>
          ))}
        </div>
      </div>

      {/* Content — spacious, unhurried */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-2xl text-lg text-slate-700 leading-[1.85]">
          <ServiceBody content={content} />
        </div>
      </section>

      {/* Closing CTA — affirming, no urgency */}
      <section className="py-20 px-4 bg-gradient-to-r from-violet-50 via-pink-50 to-amber-50">
        <div className="container mx-auto max-w-2xl text-center">
          <div className="flex justify-center mb-6">
            <RainbowBar />
          </div>
          <p className="text-violet-600 text-sm uppercase tracking-widest font-semibold mb-4">
            <SE k="closing_eyebrow">Você merece cuidado</SE>
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-violet-900 mb-3">
            <SE k="closing_heading">Aqui, sua autenticidade é celebrada. Vamos construir juntos uma vida com mais alegria.</SE>
          </h2>
          <p className="text-slate-600 mb-8 text-lg">
            <SE k="closing_text">Com a empatia de quem compartilha da sua experiência.</SE>
          </p>
          <CTAButton
            href={whatsappUrl}
            btnClass={config.ctaBtnClass}
            text={config.ctaText}
            onClick={onCTAClick}
          />
        </div>
      </section>

      <ServiceContact />
      <Footer />
    </div>
  );
}

// ─── Generic fallback ────────────────────────────────────────────────────────

function GenericLayout({
  title,
  subtitle,
  content,
  whatsappUrl,
  onCTAClick,
}: Omit<LayoutProps, "config">) {
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-20 pb-20 px-4 bg-slate-900 text-white">
        <div className="container mx-auto max-w-4xl text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            <SE k="title">{title}</SE>
          </h1>
          {subtitle && (
            <p className="text-xl text-slate-300 leading-relaxed max-w-2xl font-light">
              <SE k="subtitle" multiline>{subtitle}</SE>
            </p>
          )}
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl text-lg text-slate-700 leading-relaxed">
          <ServiceBody content={content} />
        </div>
      </section>
      <div className="py-12 flex justify-center">
        <CTAButton
          href={whatsappUrl}
          btnClass="bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-500"
          text="Agendar pelo WhatsApp"
          onClick={onCTAClick}
        />
      </div>
      <ServiceContact />
      <Footer />
    </div>
  );
}

// ─── Shared layout prop type ─────────────────────────────────────────────────

interface LayoutProps {
  title: string;
  subtitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  whatsappUrl: string;
  onCTAClick: () => void;
  config: ServiceConfig;
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface ServicePageProps {
  slug: string;
  title: string;
  subtitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  /** Settings from Postgres (CONTENT_SOURCE=api); without it the hardcoded SERVICE_CONFIG applies. */
  service?: ServiceInfo;
  pageId?: string;
}

function configFromService(sv: ServiceInfo): ServiceConfig | undefined {
  if (sv.layout === "generic" || sv.layout === "blocks") return undefined;
  const t = SERVICE_THEMES[(sv.theme as ServiceTheme) in SERVICE_THEMES ? (sv.theme as ServiceTheme) : "teal"];
  return {
    ctaText: sv.ctaText, whatsappMessage: sv.whatsappMessage, variant: sv.layout as Variant, badge: sv.badge || undefined,
    heroBg: t.heroBg, heroHeadingClass: t.heroHeadingClass, heroSubtitleClass: t.heroSubtitleClass, ctaBtnClass: t.ctaBtnClass, accentTextClass: t.accentTextClass,
  };
}

export function ServicePage(props: ServicePageProps) {
  return (
    <ServiceCtx.Provider value={{ slug: props.slug, serviceId: props.service?.id, pageId: props.pageId, showContact: props.service ? props.service.showContactSection : props.slug !== "plantao" }}>
      <ServicePageInner {...props} />
    </ServiceCtx.Provider>
  );
}

function ServicePageInner({ slug, title, subtitle, content, service }: ServicePageProps) {
  const config = service ? configFromService(service) : SERVICE_CONFIG[slug];
  const defaultMessage = service?.whatsappMessage || config?.whatsappMessage || "Olá! Gostaria de agendar uma conversa.";

  const [whatsappUrl, setWhatsappUrl] = useState(() =>
    buildWhatsappUrl(defaultMessage, true)
  );
  const { getElapsedTime } = useTimeToAction();

  useEffect(() => {
    posthog.capture("treatment_page_viewed", { treatment_title: title, slug });

    const ua = navigator.userAgent;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setWhatsappUrl(buildWhatsappUrl(defaultMessage, isMobile));
  }, [title, slug, defaultMessage]);

  const handleCTAClick = () => {
    const elapsed = getElapsedTime() ?? 0;
    const gclid = getGclidFromCookie();
    const source = service?.analyticsKey ?? `service_page_${slug}`;
    const params = { source, time_to_click_ms: elapsed, ...(gclid ? { gclid } : {}) };
    sendGAEvent("event", "schedule_click", params);
    posthog.capture("schedule_click", params);

    trackWhatsappClick(source);
  };

  if (!config) {
    return (
      <GenericLayout
        title={title}
        subtitle={subtitle}
        content={content}
        whatsappUrl={whatsappUrl}
        onCTAClick={handleCTAClick}
      />
    );
  }

  const layoutProps: LayoutProps = {
    title,
    subtitle,
    content,
    whatsappUrl,
    onCTAClick: handleCTAClick,
    config,
  };

  switch (config.variant) {
    case "plantao":
      return <PlantaoLayout {...layoutProps} />;
    case "supervisao":
      return <SupervisaoLayout {...layoutProps} />;
    case "exploratory":
      return <ExploratoryLayout {...layoutProps} />;
    case "structured":
      return <StructuredLayout {...layoutProps} />;
    case "affirmative":
      return <AffirmativeLayout {...layoutProps} />;
    default:
      return <CalmingLayout {...layoutProps} />;
  }
}
