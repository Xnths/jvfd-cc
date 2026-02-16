import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoveLeft, Home } from "lucide-react";
import "./styles/globals.css";

export const metadata = {
    title: "Página não encontrada | Psicólogo João Fernandes",
    description: "A página que você está procurando não existe ou foi movida.",
};

export default function NotFound() {
    return (
        <html lang="pt-BR">
            <body className="antialiased min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="relative flex justify-center">
                        <div className="text-[10rem] font-bold text-slate-100 dark:text-slate-800 leading-none select-none">
                            404
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-4 rounded-full border border-border shadow-sm">
                            <span className="text-4xl">🤔</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-900 dark:text-slate-100">
                            Página não encontrada
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Desculpe, não conseguimos encontrar a página que você está procurando. Ela pode ter sido removida ou o link pode estar incorreto.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                        <Button asChild variant="default" size="lg" className="w-full sm:w-auto gap-2">
                            <Link href="/">
                                <Home className="w-4 h-4" />
                                Voltar ao Início
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                            <Link href="/#contact">
                                <MoveLeft className="w-4 h-4" />
                                Fale Comigo
                            </Link>
                        </Button>
                    </div>

                    <div className="pt-12 text-sm text-muted-foreground border-t border-border mt-8">
                        <p>© {new Date().getFullYear()} Psicólogo João Fernandes</p>
                    </div>
                </div>
            </body>
        </html>
    );
}
