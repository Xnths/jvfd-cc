"use client";

import Link from "next/link";
import { Instagram, Linkedin, Mail, GraduationCap, Building2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { sendGAEvent } from "@next/third-parties/google";
import { Logo } from "@/components/brand/Logo";
import { contact, formatAddress, links, person, services } from "@/content/clinic";
import { tutoring } from "@/content/tutoring";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { Editable } from "@/edit/Editable";

const linkClass =
  "rounded-sm transition-colors hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900";
const iconClass =
  "flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-slate-900";

export function Footer() {
  const whatsappUrl = useWhatsappUrl();
  const { getElapsedTime } = useTimeToAction();

  const handleWhatsAppClick = () => {
    sendGAEvent("event", "schedule_click", {
      source: "footer",
      time_to_click_ms: getElapsedTime() || 0,
    });
  };

  return (
    <footer className="bg-green-900 py-14 text-green-50/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 grid max-w-6xl gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo size={44} className="text-white" />
            <Editable as="p" k="site.footer.tagline" className="max-w-sm text-sm leading-relaxed">
              Psicoterapia baseada em Análise do Comportamento. Online para todo o Brasil e presencial na Vila Madalena, São Paulo.
            </Editable>
            <address className="text-sm not-italic leading-relaxed text-green-50/70">
              {formatAddress()}
              <br />
              {contact.hours.daysLabel}, {contact.hours.opens} às {contact.hours.closes}
            </address>
          </div>

          <div>
            <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-white"><Editable k="site.footer.services_title">Atendimentos</Editable></h2>
            <ul className="space-y-2 text-sm">
              {services
                .filter((s) => !s.pride)
                .map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} className={linkClass}>
                      <Editable k={`site.footer.service.${s.href.slice(1)}`}>{s.name}</Editable>
                    </Link>
                  </li>
                ))}
              <li>
                <Link href={tutoring.path} className={linkClass}>
                  <Editable k="site.footer.tutoring">{tutoring.shortName}</Editable>
                </Link>
              </li>
              <li>
                <Link href="/presencial" className={linkClass}>
                  <Editable k="site.footer.presencial">Atendimento presencial</Editable>
                </Link>
              </li>
              <li>
                <Link href="/blog" className={linkClass}>
                  <Editable k="site.footer.blog">Blog</Editable>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-white"><Editable k="site.footer.contact_title">Contato</Editable></h2>
            <div className="grid w-fit grid-cols-3 gap-3">
              <a href={links.instagram} target="_blank" rel="noopener noreferrer" className={iconClass} aria-label="Instagram de João Fernandes">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={handleWhatsAppClick} className={iconClass} aria-label="Contato via WhatsApp">
                <FaWhatsapp className="h-5 w-5" />
              </a>
              <a href={links.linkedin} target="_blank" rel="noopener noreferrer" className={iconClass} aria-label="Perfil no LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href={`mailto:${contact.email}`} className={iconClass} aria-label={`Enviar e-mail para ${contact.email}`}>
                <Mail className="h-5 w-5" />
              </a>
              <a href={links.lattes} target="_blank" rel="noopener noreferrer" className={iconClass} aria-label="Currículo Lattes do CNPq">
                <GraduationCap className="h-5 w-5" />
              </a>
              <a href={`${links.oneliv}?utm_source=shared-link`} target="_blank" rel="noopener noreferrer" className={iconClass} aria-label="Perfil no Consultório Livance">
                <Building2 className="h-5 w-5" />
              </a>
            </div>
            <p className="mt-4 text-sm text-green-50/70">{contact.phoneDisplay}</p>
          </div>
        </div>

        <div className="border-t border-white/15 pt-8 text-center text-sm text-green-50/70">
          <p>© {new Date().getFullYear()} {person.name}. <Editable k="site.footer.rights">Todos os direitos reservados.</Editable></p>
          <p className="mt-1">Psicólogo, CRP {person.crp}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/politica-de-privacidade" className={`${linkClass} underline`}>
              <Editable k="site.footer.privacy">Política de Privacidade</Editable>
            </Link>
            <Link href="/termos-de-uso" className={`${linkClass} underline`}>
              <Editable k="site.footer.terms">Termos de Uso</Editable>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
