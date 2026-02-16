"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Home, AlertCircle } from "lucide-react";
import "./styles/globals.css";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service if needed
        console.error(error);
    }, [error]);

    return (
        <html lang="pt-BR">
            <body className="antialiased min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
                <div className="max-w-md w-full text-center space-y-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full">
                            <AlertCircle className="w-16 h-16 text-red-500 dark:text-red-400" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-900 dark:text-slate-100">
                            Algo deu errado
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Pedimos desculpas, mas encontramos um erro inesperado ao processar sua solicitação.
                        </p>
                        {error.digest && (
                            <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                                Código do erro: {error.digest}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                        <Button
                            onClick={() => reset()}
                            variant="default"
                            size="lg"
                            className="w-full sm:w-auto gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Tentar Novamente
                        </Button>
                        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                            <Link href="/">
                                <Home className="w-4 h-4" />
                                Voltar ao Início
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
