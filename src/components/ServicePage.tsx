"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import posthog from "posthog-js";
import { sendGAEvent } from "@next/third-parties/google";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { RichText } from "@/components/RichText";
import { Footer } from "@/components/Footer";
import { Contact } from "@/components/Contact";

// ─── Per-service config ─────────────────────────────────────────────────────

const PHONE = "5511955591996";

type Variant = "calming" | "structured" | "plantao" | "supervisao" | "exploratory";

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
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildWhatsappUrl(message: string, isMobile: boolean): string {
  const encoded = encodeURIComponent(message);
  if (isMobile) return `https://wa.me/${PHONE}?text=${encoded}`;
  return `https://api.whatsapp.com/send?phone=${PHONE}&text=${encoded}`;
}

// ─── Shared chrome ──────────────────────────────────────────────────────────

function NavBar({ dark = false }: { dark?: boolean }) {
  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 backdrop-blur-md border-b transition-colors ${
        dark
          ? "bg-slate-900/90 border-slate-700"
          : "bg-white/85 border-slate-200"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/#services"
          className={`flex items-center gap-2 font-medium transition-colors ${
            dark
              ? "text-slate-300 hover:text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para Início
        </Link>
        <span
          className={`font-semibold hidden sm:block ${
            dark ? "text-slate-200" : "text-slate-800"
          }`}
        >
          João Fernandes | Psicólogo
        </span>
      </div>
    </header>
  );
}

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
      {text}
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
    <main className="min-h-screen bg-white">
      <NavBar />

      {/* Hero — spacious, airy, validating */}
      <section className={`pt-36 pb-24 px-4 ${config.heroBg}`}>
        <div className="container mx-auto max-w-3xl text-center">
          {config.badge && (
            <span
              className={`inline-block text-sm font-semibold uppercase tracking-widest mb-4 ${config.accentTextClass}`}
            >
              {config.badge}
            </span>
          )}
          <h1
            className={`text-4xl md:text-5xl font-bold leading-tight mb-6 ${config.heroHeadingClass}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={`text-xl md:text-2xl leading-relaxed font-light max-w-2xl mx-auto ${config.heroSubtitleClass}`}
            >
              {subtitle}
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
            Sem compromissos. Apenas uma conversa.
          </p>
        </div>
      </section>

      {/* Rich content */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-2xl text-lg text-slate-700 leading-relaxed">
          <RichText content={content} />
        </div>
      </section>

      {/* CTA before footer */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="container mx-auto max-w-2xl text-center">
          <p className={`text-sm font-semibold uppercase tracking-widest mb-3 ${config.accentTextClass}`}>
            Próximo passo
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
            Você não precisa ter certeza para começar.
          </h2>
          <CTAButton
            href={whatsappUrl}
            btnClass={config.ctaBtnClass}
            text={config.ctaText}
            onClick={onCTAClick}
          />
        </div>
      </section>

      <Contact />
      <Footer />
    </main>
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
    <main className="min-h-screen bg-white">
      <NavBar />

      {/* Hero — stark, left-aligned, no-nonsense */}
      <section className="pt-36 pb-20 px-4 border-b border-slate-200">
        <div className="container mx-auto max-w-4xl">
          {config.badge && (
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
              {config.badge}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight max-w-2xl mb-6">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
              {subtitle}
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
              <RichText content={content} />
            </div>
            {/* Sidebar — 1/3 */}
            <aside className="space-y-6">
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 sticky top-24">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Próximo passo
                </p>
                <p className="text-slate-800 font-semibold mb-5 leading-snug">
                  Estratégias práticas que respeitam o seu ritmo.
                </p>
                <CTAButton
                  href={whatsappUrl}
                  btnClass={config.ctaBtnClass}
                  text={config.ctaText}
                  onClick={onCTAClick}
                />
                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  Atendimento presencial em Vila Madalena ou online.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Contact />
      <Footer />
    </main>
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
    <main className="min-h-screen bg-white">
      <NavBar />

      {/* Full-viewport hero — CTA visible without scrolling */}
      <section className="min-h-[90svh] flex flex-col items-center justify-center px-4 text-center pt-16">
        {config.badge && (
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
            {config.badge}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight max-w-2xl mb-4">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl text-slate-600 max-w-xl leading-relaxed mb-8">
            {subtitle}
          </p>
        )}
        <p className="text-slate-700 text-lg font-medium mb-8 max-w-md">
          Você não precisa passar por isso sozinho hoje.
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
          Resposta rápida. Sem julgamentos.
        </p>
      </section>

      {/* Secondary content — only for users who scroll */}
      {content && (
        <section className="py-16 px-4 border-t border-slate-100">
          <div className="container mx-auto max-w-xl text-slate-700 leading-relaxed">
            <RichText content={content} />
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
    </main>
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
    <main className="min-h-screen bg-white">
      <NavBar />

      {/* Hero — gradient, reflective, meditative */}
      <section className={`pt-40 pb-28 px-4 ${config.heroBg}`}>
        <div className="container mx-auto max-w-3xl text-center">
          {config.badge && (
            <span
              className={`inline-block text-sm font-semibold uppercase tracking-widest mb-5 ${config.accentTextClass}`}
            >
              {config.badge}
            </span>
          )}
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8 ${config.heroHeadingClass}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={`text-xl md:text-2xl leading-relaxed font-light ${config.heroSubtitleClass}`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Spacious content — invites deep reading */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-2xl text-xl text-stone-700 leading-[1.9]">
          <RichText content={content} />
        </div>
      </section>

      {/* Reflective CTA section */}
      <section className="py-20 px-4 bg-gradient-to-r from-amber-50 to-stone-50">
        <div className="container mx-auto max-w-2xl text-center">
          <p className="text-stone-500 text-sm uppercase tracking-widest font-semibold mb-4">
            Quando estiver pronto
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-3">
            Dar nome ao que se sente é o primeiro passo.
          </h2>
          <p className="text-stone-600 mb-8 text-lg">
            Não há urgência. Há um espaço esperando por você.
          </p>
          <CTAButton
            href={whatsappUrl}
            btnClass={config.ctaBtnClass}
            text={config.ctaText}
            onClick={onCTAClick}
          />
        </div>
      </section>

      <Contact />
      <Footer />
    </main>
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
    <main className="min-h-screen bg-white">
      <NavBar dark />

      {/* Hero — dark, authoritative */}
      <section className="pt-36 pb-24 px-4 bg-slate-900">
        <div className="container mx-auto max-w-4xl">
          {config.badge && (
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-red-400 mb-6">
              {config.badge}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight max-w-2xl mb-6">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xl text-slate-300 max-w-xl leading-relaxed mb-10 font-light">
              {subtitle}
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
            (tag) => (
              <span
                key={tag}
                className="text-sm text-slate-300 font-medium before:content-['—'] before:text-red-500 before:mr-2"
              >
                {tag}
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
              <RichText content={content} />
            </div>
            <aside className="space-y-6">
              <div className="border border-slate-200 rounded-2xl p-6 sticky top-24">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Para psicólogos
                </p>
                <p className="text-slate-800 font-semibold mb-5 leading-snug text-sm">
                  Supervisão clínica em Análise do Comportamento com foco em
                  aprimoramento técnico e ética.
                </p>
                <CTAButton
                  href={whatsappUrl}
                  btnClass={config.ctaBtnClass}
                  text={config.ctaText}
                  onClick={onCTAClick}
                />
                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  Atendimento presencial em Vila Madalena ou online.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Contact />
      <Footer />
    </main>
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
    <main className="min-h-screen bg-white">
      <NavBar />
      <section className="pt-32 pb-20 px-4 bg-slate-900 text-white">
        <div className="container mx-auto max-w-4xl text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xl text-slate-300 leading-relaxed max-w-2xl font-light">
              {subtitle}
            </p>
          )}
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl text-lg text-slate-700 leading-relaxed">
          <RichText content={content} />
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
      <Contact />
      <Footer />
    </main>
  );
}

// ─── Shared layout prop type ─────────────────────────────────────────────────

interface LayoutProps {
  title: string;
  subtitle?: string;
  content: unknown;
  whatsappUrl: string;
  onCTAClick: () => void;
  config: ServiceConfig;
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface ServicePageProps {
  slug: string;
  title: string;
  subtitle?: string;
  content: unknown;
}

export function ServicePage({ slug, title, subtitle, content }: ServicePageProps) {
  const config = SERVICE_CONFIG[slug];
  const defaultMessage = config?.whatsappMessage ?? "Olá! Gostaria de agendar uma conversa.";

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
    sendGAEvent("event", "schedule_click", {
      source: `service_page_${slug}`,
      time_to_click_ms: elapsed,
    });
    posthog.capture("schedule_click", {
      source: `service_page_${slug}`,
      time_to_click_ms: elapsed,
    });
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
    default:
      return <CalmingLayout {...layoutProps} />;
  }
}
