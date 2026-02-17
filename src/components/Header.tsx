import Link from "next/link";
import { whatsappUrl } from "@/lib/constant";

export function Header() {
    return (
        <header className="bg-slate-900 text-white py-4 shadow-md">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link href="/" className="text-xl font-bold hover:text-slate-300 transition-colors">
                    Psicólogo João Fernandes
                </Link>

                <nav className="hidden md:flex gap-6 items-center">
                    <Link href="/" className="hover:text-slate-300 transition-colors">
                        Home
                    </Link>
                    <Link href="/#about" className="hover:text-slate-300 transition-colors">
                        Sobre
                    </Link>
                    <Link href="/#services" className="hover:text-slate-300 transition-colors">
                        Serviços
                    </Link>
                    <Link href="/blog" className="hover:text-slate-300 transition-colors">
                        Blog
                    </Link>
                    <Link href="/#contact" className="hover:text-slate-300 transition-colors">
                        Contato
                    </Link>
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-bold transition-all ml-4"
                    >
                        Agendar
                    </a>
                </nav>

                {/* Mobile Menu Placeholder - For simplicity, linking to home effectively acts as a reset */}
                <div className="md:hidden">
                    <Link href="/" className="text-sm border border-white/20 px-3 py-1 rounded hover:bg-white/10">
                        Voltar ao Início
                    </Link>
                </div>
            </div>
        </header>
    );
}
