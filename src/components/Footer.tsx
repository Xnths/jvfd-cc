import { whatsappUrl } from "@/lib/constant";
import { Facebook, Twitter, Instagram, Linkedin, Mail, GraduationCap, Building2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto mb-8">
          <div className="col-span-3">
            <h4 className="text-white mb-4">Acesso rápido</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/#services" className="hover:text-white focus:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-sm">
                  Como posso te ajudar?
                </a>
              </li>
              <li>
                <a href="/#testimonials" className="hover:text-white focus:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-sm">
                  Depoimentos
                </a>
              </li>
              <li>
                <a href="/#about" className="hover:text-white focus:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-sm">
                  Sobre
                </a>
              </li>
              <li>
                <a href="/#excellence" className="hover:text-white focus:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-sm">
                  Formações
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white focus:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-sm">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/#contact" className="hover:text-white focus:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-sm">
                  Contato
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white mb-4">Contato</h4>
            <div className="grid grid-cols-3 gap-4 w-fit">
              <a
                href="https://www.instagram.com/ciencia_comportamental_"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 focus:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Instagram de João Fernandes"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 focus:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Contato via WhatsApp"
              >
                <FaWhatsapp className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/psicologo-joao-fernandes-d/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 focus:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Perfil no LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="mailto:jvfd2014@hotmail.com"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 focus:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Enviar email para jvfd2014@hotmail.com"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="https://lattes.cnpq.br/2507330776380191"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 focus:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Currículo Lattes do CNPq"
              >
                <GraduationCap className="w-5 h-5" />
              </a>
              <a
                href="https://oneliv.com.br/profissional/joao-vitor-fernandes-domingues?utm_source=shared-link"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 focus:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Perfil no Consultório Livance"
              >
                <Building2 className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-sm">
          <p>© {new Date().getFullYear()} João Vitor Fernandes Domingues. Todos os direitos reservados.</p>
          <p className="mt-2 text-slate-400">
            Psicólogo Analítico-Comportamental.
          </p>
          <p className="mt-2 text-slate-400">
            CRP: 06/157908
          </p>
          <p className="mt-2 text-slate-400">
            Rua Harmonia, 1323 - Vila Madalena, São Paulo - SP, 05435-001
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <a href="/politica-de-privacidade" className="text-slate-400 hover:text-white focus:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-sm">
              Política de Privacidade
            </a>
            <span className="text-slate-500" aria-hidden="true">|</span>
            <a href="/termos-de-uso" className="text-slate-400 hover:text-white focus:text-white transition-colors underline focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-sm">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
