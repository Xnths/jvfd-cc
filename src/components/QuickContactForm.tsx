"use client";

import { useState, useRef } from "react";
import { submitLead } from "@/app/(website)/actions/submit-lead";
import { sendGAEvent } from "@next/third-parties/google";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { FaInstagram } from "react-icons/fa";
import { MoveRight, Phone } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import Link from "next/link";

/**
 * Applies a Brazilian phone mask: (XX) 9XXXX-XXXX or (XX) XXXX-XXXX
 */
function applyPhoneMask(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function QuickContactForm() {
    const [open, setOpen] = useState(false);
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const { getElapsedTime } = useTimeToAction();

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(applyPhoneMask(e.target.value));
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const digits = phone.replace(/\D/g, "");
        if (digits.length < 10) {
            setError("Digite um número válido com DDD.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        const result = await submitLead(digits);

        if (result.success) {
            const elapsedTime = getElapsedTime() || 0;

            sendGAEvent("event", "generate_qualified_lead", {
                source: "hero_phone_form",
                time_to_submit_ms: elapsedTime,
            });

            setOpen(false);
            setShowSuccess(true);
            setPhone("");
        } else {
            setError(result.error || "Erro ao enviar. Tente novamente.");
        }

        setIsSubmitting(false);
    };

    return (
        <>
            {/* Trigger Button */}
            <Button
                onClick={() => setOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-md text-lg font-bold transition-all text-center shadow-lg inline-flex items-center justify-center gap-2 h-auto w-full"
            >
                <Phone className="w-5 h-5" />
                Deixar meu contato
            </Button>

            {/* Form Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-slate-900">
                            Deixe seu número
                        </DialogTitle>
                        <DialogDescription className="text-slate-600">
                            O número será enviado diretamente para o João, que lhe enviará uma mensagem pessoalmente pelo WhatsApp.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="quick-phone" className="text-slate-700 text-sm font-medium">
                                Seu telefone com DDD
                            </label>
                            <Input
                                id="quick-phone"
                                ref={inputRef}
                                type="tel"
                                placeholder="Ex.: (11) 91234-5678"
                                value={phone}
                                onChange={handlePhoneChange}
                                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-green-600 focus:ring-green-600/30"
                                aria-label="Seu número de telefone"
                                disabled={isSubmitting}
                                autoFocus
                            />
                            {error && (
                                <p className="text-red-500 text-sm font-medium" role="alert">{error}</p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting || phone.replace(/\D/g, "").length < 10}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold w-full disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-white/80"
                        >
                            {isSubmitting ? "Enviando..." : "Enviar número"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="text-center items-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg
                                className="w-8 h-8 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <DialogTitle className="text-xl text-slate-900">
                            Número enviado com sucesso!
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 text-base">
                            O João irá entrar em contato pessoalmente pelo WhatsApp assim que possível.
                            Enquanto isso, que tal acompanhar o trabalho dele?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 pt-2">
                        <a
                            href="https://www.instagram.com/ciencia_comportamental_"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group"
                        >
                            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <FaInstagram className="w-5 h-5 text-pink-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-slate-900 text-sm">Siga no Instagram</p>
                                <p className="text-slate-500 text-xs">@ciencia_comportamental_</p>
                            </div>
                            <MoveRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                        </a>

                        <Link
                            href="/blog"
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group"
                        >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-slate-900 text-sm">Leia o Blog</p>
                                <p className="text-slate-500 text-xs">Artigos sobre saúde mental e autoconhecimento</p>
                            </div>
                            <MoveRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <DialogFooter className="sm:justify-center pt-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="w-full sm:w-auto">
                                Fechar
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
