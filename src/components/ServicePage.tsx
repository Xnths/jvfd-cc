"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Editable } from "@/edit/Editable";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { serviceLandings, faqDisplay, type LandingImage, type ServiceLanding } from "@/content/service-landings";
import { useEdit } from "@/edit/EditContext";
import type { ServiceInfo } from "@/lib/queries";
import { LANDING_THEMES, SERVICE_THEMES, type ServiceTheme } from "@/lib/service-themes";
import posthog from "posthog-js";
import { CTAButton as BaseCTAButton, useWhatsappCta } from "@/components/WhatsappCta";
import { CredentialBand } from "@/components/CredentialBand";
import { BringList, FactChips, FaqAccordion, NoReferralBand } from "@/components/AvaliacaoBlocks";
import { StickyCtaBar } from "@/components/StickyWhatsappBar";
import { conditions, conditionPath, OTHER_CARD } from "@/content/avaliacoes";
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

// ─── Shared chrome ──────────────────────────────────────────────────────────

function CTAButton({ href, btnClass, text, onClick, size = "default", marker }: { href: string; btnClass: string; text: string; onClick: () => void; size?: "default" | "large" | "responsive"; marker?: string }) {
  return (
    <BaseCTAButton href={href} btnClass={btnClass} onClick={onClick} size={size} marker={marker}>
      <SE k="cta">{text}</SE>
    </BaseCTAButton>
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

// ─── Layout: Landing (service pages with copy in src/content/service-landings.ts) ─────────
// One order for every service, because it answers what stops people from asking for help: what this is for, whether
// it applies to me, what the evidence says (with its limits), what will happen, who does it, what about convênio.
// Pictures sit next to the text they support, with a caption (Houts et al., 2006). Crisis pages open with the
// emergency numbers. See CLAUDE.md for the copy rules.

function LandingPicture({ image, k, className = "", priority = false }: { image: LandingImage; k: string; className?: string; priority?: boolean }) {
  return (
    <figure className={className}>
      <Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(max-width: 768px) 100vw, 45vw" priority={priority} className="w-full h-auto rounded-lg shadow-lg" />
      {image.caption && <figcaption className="mt-2 text-xs text-slate-500"><SE k={`${k}_caption`}>{image.caption}</SE></figcaption>}
    </figure>
  );
}

function LandingEyebrow({ k, className, children }: { k: string; className: string; children: string }) {
  return <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 ${className}`}><SE k={k}>{children}</SE></p>;
}

// "Para quem é": one row per group (labels reuse the when_<gi>_* keys), a card per condition page, then "Outras queixas",
// which opens WhatsApp through the page's own tracked CTA handler.
function ConditionGrid({ groups, whatsappUrl, onCTAClick, t }: { groups: ServiceLanding["when"]["groups"]; whatsappUrl: string; onCTAClick: () => void; t: (typeof LANDING_THEMES)[keyof typeof LANDING_THEMES] }) {
  const { editing } = useEdit();
  // Phones: a compact row (title, tags, chevron). From sm up: the full card with description and link text.
  const cardClass = "group flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 sm:items-stretch sm:p-5";
  return (
    <div className="space-y-7 sm:space-y-10">
      {groups.map((g, gi) => {
        const items = conditions.filter((c) => c.group === gi);
        if (!items.length) return null;
        return (
          <div key={gi}>
            <h3 className="font-serif text-xl font-semibold text-slate-900"><SE k={`when_${gi}_title`}>{g.title}</SE></h3>
            <p className="hidden sm:block text-sm text-slate-600 leading-relaxed mb-4"><SE k={`when_${gi}_text`} multiline>{g.text}</SE></p>
            <ul className="mt-3 grid gap-2.5 sm:mt-0 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => {
                const inner = (
                  <>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold text-base sm:text-lg text-slate-900 leading-snug"><Editable k={`avaliacao.${c.slug}.card_title`}>{c.card.title}</Editable></span>
                      <span className="hidden sm:block mt-2 text-sm text-slate-600 leading-relaxed"><Editable k={`avaliacao.${c.slug}.card_description`} multiline>{c.card.description}</Editable></span>
                      <span className="mt-2 sm:mt-3 flex flex-wrap gap-1.5">
                        {c.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{tag}</span>
                        ))}
                      </span>
                      <span className={`hidden sm:block mt-auto pt-4 text-sm font-semibold ${t.eyebrow} group-hover:underline`}><Editable k="avaliacao.sub.card_link">Entenda a investigação →</Editable></span>
                    </span>
                    <span className="text-2xl leading-none text-slate-400 sm:hidden" aria-hidden>›</span>
                  </>
                );
                return (
                  <li key={c.slug}>
                    {editing ? <div className={cardClass}>{inner}</div> : <Link href={conditionPath(c.slug)} className={cardClass}>{inner}</Link>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={editing ? (e) => e.preventDefault() : onCTAClick} className="flex flex-col rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-slate-500 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <span>
          <span className="block font-semibold text-lg text-slate-900"><Editable k="avaliacao.other.card_title">{OTHER_CARD.title}</Editable></span>
          <span className="block mt-1 text-sm text-slate-600"><Editable k="avaliacao.other.card_description">{OTHER_CARD.description}</Editable></span>
        </span>
        <span className={`mt-3 sm:mt-0 shrink-0 text-sm font-semibold ${t.eyebrow}`}><Editable k="avaliacao.other.card_link">{OTHER_CARD.link}</Editable></span>
      </a>
    </div>
  );
}

function LandingLayout({ data, title, subtitle, content, whatsappUrl, onCTAClick }: Omit<LayoutProps, "config"> & { data: ServiceLanding }) {
  const t = LANDING_THEMES[data.theme];
  const groupCols = data.when.groups.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  // Pages with the credential band keep H1, band and CTA above the fold on a 375×667 phone, and use tighter
  // section spacing on phones.
  const compact = !!data.hero.credentials;
  const sec = compact ? "py-12 md:py-20" : "py-20";
  const { slug } = useContext(ServiceCtx);
  const [allFindings, setAllFindings] = useState(false);
  const collapseFindings = !!data.research.more && !allFindings;
  return (
    <div className="min-h-screen bg-white">
      {data.safety && (
        <section className="px-4 py-6 bg-red-50 border-b-2 border-red-200" aria-label="Contatos de emergência">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-lg md:text-xl font-bold text-red-900 mb-1"><SE k="safety_title">{data.safety.title}</SE></h2>
            <p className="text-red-900 leading-relaxed mb-4"><SE k="safety_text" multiline>{data.safety.text}</SE></p>
            <div className="flex flex-wrap gap-3">
              {data.safety.actions.map((a, i) => (
                <a key={a.href} href={a.href} className="inline-flex flex-col rounded-xl bg-red-800 hover:bg-red-900 text-white px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500">
                  <span className="text-lg font-bold"><SE k={`safety_action_${i}`}>{a.label}</SE></span>
                  <span className="text-sm"><SE k={`safety_action_${i}_detail`}>{a.detail}</SE></span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hero */}
      <section className={`${compact ? "pt-5 pb-12" : "pt-16 pb-16"} md:pt-20 md:pb-16 px-4 ${t.heroBg}`}>
        <div className={`container mx-auto ${data.hero.image ? "max-w-6xl grid md:grid-cols-5 gap-10 items-center" : "max-w-4xl"}`}>
          <div className={data.hero.image ? "md:col-span-3" : ""}>
            <span className={`${compact ? "hidden md:inline-block" : "inline-block"} text-xs font-bold uppercase tracking-[0.2em] mb-5 ${t.heroEyebrow}`}>
              <SE k="badge">{data.hero.badge}</SE>
            </span>
            <h1 className={`font-serif ${compact ? "text-[2rem] mb-2 md:mb-5" : "text-4xl mb-5"} md:text-5xl font-semibold leading-tight ${t.heroHeading}`}>
              <SE k="title">{title || data.hero.title}</SE>
            </h1>
            <p className={`${compact ? "text-[15px] leading-snug mb-3" : "text-base leading-relaxed mb-5"} md:text-xl md:leading-relaxed max-w-xl md:mb-8 ${t.heroText}`}>
              <SE k="subtitle" multiline>{subtitle || data.hero.subtitle}</SE>
            </p>
            {compact && <CredentialBand className="mb-4 md:mb-8 max-w-2xl" />}
            {data.hero.facts && (
              <ul className={`mb-6 max-w-xl space-y-1.5 text-sm md:text-base leading-snug ${t.heroText}`}>
                {data.hero.facts.map((f, i) => (
                  <li key={i} className="flex gap-2"><span aria-hidden="true">•</span><span><SE k={`hero_fact_${i}`} multiline>{f}</SE></span></li>
                ))}
              </ul>
            )}
            <CTAButton href={whatsappUrl} btnClass={t.cta} text={data.hero.cta} onClick={onCTAClick} size={compact ? "responsive" : "large"} marker="hero" />
            {data.hero.chips && (
              <FactChips className="mt-4 max-w-xl" items={data.hero.chips.map((c, i) => <SE key={i} k={`hero_chip_${i}`}>{c}</SE>)} />
            )}
            <p className={`${data.hero.chips ? "mt-3 text-xs md:text-sm" : "mt-4 text-sm"} max-w-md ${t.heroNote}`}>
              <SE k="hero_note" multiline>{data.hero.note}</SE>
            </p>
            {/* Phones: a small avatar instead of the large photo (which took a whole screen). */}
            {data.hero.byline && data.hero.image && (
              <div className="mt-5 flex items-center gap-3 md:hidden">
                <Image src={data.hero.image.src} alt={data.hero.image.alt} width={48} height={48} className="h-12 w-12 rounded-full object-cover object-top" />
                <p className="text-sm font-medium text-slate-700"><SE k="hero_byline">{data.hero.byline}</SE></p>
              </div>
            )}
          </div>
          {data.hero.image && <LandingPicture image={data.hero.image} k="hero_image" className={`md:col-span-2 ${data.hero.byline ? "hidden md:block" : ""}`} priority />}
        </div>
      </section>

      {/* Credentials (pages with the hero band skip it: the titles are already above) */}
      {!compact && <div className="border-y border-slate-200 bg-white py-5 px-4">
        <ul className="container mx-auto max-w-6xl flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-medium text-slate-700">
          {data.strip.map((text, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} aria-hidden />
              <SE k={`strip_${i}`}>{text}</SE>
            </li>
          ))}
        </ul>
      </div>}

      {/* When to look for it */}
      <section className={`${sec} px-4`}>
        <div className="container mx-auto max-w-6xl">
          <LandingEyebrow k="when_eyebrow" className={t.eyebrow}>{data.when.eyebrow}</LandingEyebrow>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-slate-900 mb-4 max-w-3xl"><SE k="when_title">{data.when.title}</SE></h2>
          <p className={`text-lg text-slate-600 leading-relaxed max-w-3xl ${compact ? "mb-8 md:mb-12" : "mb-12"}`}><SE k="when_intro" multiline>{data.when.intro}</SE></p>
          {data.when.cards ? (
            <ConditionGrid groups={data.when.groups} whatsappUrl={whatsappUrl} onCTAClick={onCTAClick} t={t} />
          ) : (
          <div className={`grid gap-6 ${groupCols}`}>
            {data.when.groups.map((g, gi) => (
              <div key={gi} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-serif text-xl font-semibold text-slate-900 mb-2"><SE k={`when_${gi}_title`}>{g.title}</SE></h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4"><SE k={`when_${gi}_text`} multiline>{g.text}</SE></p>
                <ul className="space-y-2 text-slate-800">
                  {g.items.map((item, ii) => (
                    <li key={ii} className="flex gap-2"><span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} aria-hidden /><SE k={`when_${gi}_item_${ii}`}>{item}</SE></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* No referral yet */}
      {data.noReferral && (
        <section className="px-4 pb-12 md:pb-20">
          <div className="container mx-auto max-w-6xl">
            <NoReferralBand
              title={<SE k="no_referral_title">{data.noReferral.title}</SE>}
              text={<SE k="no_referral_text" multiline>{data.noReferral.text}</SE>}
              cta={
                <BaseCTAButton href={whatsappUrl} btnClass={t.cta} onClick={onCTAClick}>
                  <SE k="no_referral_cta">{data.noReferral.cta}</SE>
                </BaseCTAButton>
              }
            />
          </div>
        </section>
      )}

      {/* What it is (rich text, edited in place) */}
      <section className={`${compact ? "pb-12 md:pb-20" : "pb-20"} px-4`}>
        <div className={`container mx-auto ${data.bodyImage ? "max-w-6xl grid md:grid-cols-2 gap-10 items-center" : "max-w-3xl"}`}>
          <div className="text-lg text-slate-700 leading-relaxed">
            <ServiceBody content={content} />
          </div>
          {data.bodyImage && <LandingPicture image={data.bodyImage} k="body_image" />}
        </div>
      </section>

      {/* Process */}
      <section className={`${sec} px-4 ${t.soft}`} id="como-funciona">
        <div className="container mx-auto max-w-4xl">
          <LandingEyebrow k="steps_eyebrow" className={t.eyebrow}>{data.steps.eyebrow}</LandingEyebrow>
          <h2 className={`font-serif text-3xl md:text-4xl font-semibold text-slate-900 ${compact ? "mb-7 md:mb-10" : "mb-10"}`}><SE k="steps_title">{data.steps.title}</SE></h2>
          <ol className={`relative border-l-2 ml-4 ${compact ? "space-y-5 md:space-y-8" : "space-y-8"} ${t.line}`}>
            {data.steps.items.map((s, i) => (
              <li key={i} className="pl-8 relative">
                <span className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full text-white text-sm font-semibold flex items-center justify-center ${t.stepBg}`}>{i + 1}</span>
                <h3 className="font-semibold text-slate-900 text-lg"><SE k={`steps_${i}_title`}>{s.title}</SE></h3>
                <p className="text-slate-600 leading-relaxed"><SE k={`steps_${i}_text`} multiline>{s.text}</SE></p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What you receive */}
      {data.deliverables && (
        <section className={`${sec} px-4`} id="o-que-voce-recebe">
          <div className="container mx-auto max-w-6xl">
            <LandingEyebrow k="deliverables_eyebrow" className={t.eyebrow}>{data.deliverables.eyebrow}</LandingEyebrow>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-slate-900 mb-7 md:mb-10"><SE k="deliverables_title">{data.deliverables.title}</SE></h2>
            <div className="grid gap-3 md:gap-6 md:grid-cols-3">
              {data.deliverables.items.map((d, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 p-5 md:p-6">
                  <h3 className="font-serif text-xl font-semibold text-slate-900 mb-2"><SE k={`deliverables_${i}_title`}>{d.title}</SE></h3>
                  <p className="text-slate-600 leading-relaxed"><SE k={`deliverables_${i}_text`} multiline>{d.text}</SE></p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Research */}
      <section className={`${sec} px-4 text-white ${t.band}`} id="respaldo-cientifico">
        <div className="container mx-auto max-w-4xl">
          <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 ${t.bandAccent}`}><SE k="research_eyebrow">{data.research.eyebrow}</SE></p>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-10"><SE k="research_title">{data.research.title}</SE></h2>
          <ol className="space-y-6">
            {data.research.findings.map((f, i) => (
              <li key={i} className={`gap-5 ${collapseFindings && i >= 2 ? "hidden md:flex" : "flex"}`}>
                <span className={`font-serif text-3xl leading-none w-8 shrink-0 ${t.bandAccent}`}>{i + 1}</span>
                <p className="text-lg text-slate-100 leading-relaxed">
                  <SE k={`research_${i}`} multiline>{f.text}</SE>
                  <sup className={`ml-1 ${t.bandAccent}`}><a href="#referencias" className="underline">[{f.refs.join(", ")}]</a></sup>
                </p>
              </li>
            ))}
          </ol>
          {collapseFindings && data.research.findings.length > 2 && (
            <button type="button" onClick={() => setAllFindings(true)} className={`mt-6 text-sm font-semibold underline md:hidden ${t.bandAccent}`}>
              <SE k="research_more">{data.research.more!}</SE>
            </button>
          )}
          <p className="mt-10 text-sm text-slate-300 leading-relaxed border-t border-white/20 pt-6"><SE k="research_caveat" multiline>{data.research.caveat}</SE></p>
        </div>
      </section>

      {/* Professional */}
      <section className={`${sec} px-4`}>
        <div className="container mx-auto max-w-6xl grid md:grid-cols-5 gap-10 items-center">
          <LandingPicture image={data.about.image} k="about_image" className={`md:col-span-2 ${compact ? "[&_img]:max-h-56 [&_img]:object-cover md:[&_img]:max-h-none" : ""}`} />
          <div className="md:col-span-3">
            <LandingEyebrow k="about_eyebrow" className={t.eyebrow}>{data.about.eyebrow}</LandingEyebrow>
            <h2 className="font-serif text-3xl font-semibold text-slate-900 mb-4"><SE k="about_title">{data.about.title}</SE></h2>
            {data.about.approach ? (
              <>
                {data.about.role && <p className="-mt-2 mb-5 font-medium text-slate-700"><SE k="about_role">{data.about.role}</SE></p>}
                <CredentialBand variant="list" className="mb-6 hidden md:block" />
                {/* TODO: confirm with João whether he talks directly with the requesting physician; until then the text only says the laudo is written for them. */}
                <p className="text-lg text-slate-700 leading-relaxed"><SE k="about_approach" multiline>{data.about.approach}</SE></p>
              </>
            ) : (
              <p className="text-lg text-slate-700 leading-relaxed"><SE k="about_text" multiline>{data.about.text}</SE></p>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`${sec} px-4 bg-slate-50`} id="faq">
        <div className="container mx-auto max-w-3xl">
          <h2 className={`font-serif text-3xl md:text-4xl font-semibold text-slate-900 text-center ${data.faqAccordion ? "mb-6 md:mb-10" : "mb-10"}`}><SE k="faq_title">{data.faqTitle}</SE></h2>
          {data.faqAccordion ? (
            <FaqAccordion
              items={faqDisplay(data.faq).map(({ item: f, i }) => ({
                id: i,
                question: <SE k={`faq_${i}_q`}>{f.question}</SE>,
                answer: <SE k={`faq_${i}_a`} multiline>{f.answer}</SE>,
              }))}
            />
          ) : (
          <ul className="space-y-6">
            {faqDisplay(data.faq).map(({ item: f, i }) => (
              <li key={i} className="border-b border-slate-200 pb-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-2"><SE k={`faq_${i}_q`}>{f.question}</SE></h3>
                <p className="text-slate-600 leading-relaxed"><SE k={`faq_${i}_a`} multiline>{f.answer}</SE></p>
              </li>
            ))}
          </ul>
          )}
        </div>
      </section>

      {/* What to bring */}
      {data.bring && (
        <section className={`${sec} px-4`} id="o-que-levar">
          <div className="container mx-auto max-w-3xl">
            <BringList
              title={<SE k="bring_title">{data.bring.title}</SE>}
              items={data.bring.items.map((item, i) => <SE key={i} k={`bring_${i}`}>{item}</SE>)}
            />
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className={`py-16 px-4 ${t.soft}`}>
        <div className="container mx-auto max-w-2xl text-center">
          <LandingEyebrow k="closing_eyebrow" className={t.eyebrow}>{data.closing.eyebrow}</LandingEyebrow>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 mb-6"><SE k="closing_heading">{data.closing.title}</SE></h2>
          <CTAButton href={whatsappUrl} btnClass={t.cta} text={data.closing.cta} onClick={onCTAClick} size="large" marker="closing" />
          {data.closing.note && (
            <p className="mt-4 text-sm text-slate-600 max-w-md mx-auto"><SE k="closing_note" multiline>{data.closing.note}</SE></p>
          )}
        </div>
      </section>

      {/* References */}
      <section className="py-12 px-4" id="referencias">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4"><SE k="refs_title">{data.referencesTitle}</SE></h2>
          <ol className="space-y-2 text-xs text-slate-500 leading-relaxed">
            {data.references.map((r) => (
              <li key={r.n}>
                [{r.n}] {r.text}{" "}
                {r.doi && <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer" className="underline">doi:{r.doi}</a>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ServiceContact />
      <Footer />
      {data.stickyCta && (
        <StickyCtaBar href={whatsappUrl} onClick={onCTAClick} btnClass={t.cta} text={data.stickyCta.text} textKey={`service.${slug}.sticky_cta`} note={data.stickyCta.note} noteKey={`service.${slug}.sticky_note`} />
      )}
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

  const source = service?.analyticsKey ?? `service_page_${slug}`;
  const { href: whatsappUrl, onClick: handleCTAClick } = useWhatsappCta(defaultMessage, source);

  useEffect(() => {
    posthog.capture("treatment_page_viewed", { treatment_title: title, slug });
  }, [title, slug]);

  const landing = serviceLandings[slug];
  if (landing) {
    return (
      <LandingLayout
        data={landing}
        title={title}
        subtitle={subtitle}
        content={content}
        whatsappUrl={whatsappUrl}
        onCTAClick={handleCTAClick}
      />
    );
  }

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
