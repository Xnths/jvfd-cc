import { whatsappUrl } from "@/lib/constant";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
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
                <a href="#services" className="hover:text-white transition-colors">
                  Atendimentos
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  Sobre
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white mb-4">Contato</h4>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/ciencia_comportamental_"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-sm">
          <p>© {new Date().getFullYear()} João Vitor Fernandes. Todos os direitos reservados.</p>
          <p className="mt-2 text-slate-400">
            Psicólogo Analítico-Comportamental.
          </p>
          <p className="mt-2 text-slate-400">
            CRP: 06/157908
          </p>
          <p className="mt-2 text-slate-400">
            Rua Harmonia, 1323 - Vila Madalena, São Paulo - SP, 05435-001
          </p>
        </div>
      </div>
    </footer>
  );
}
