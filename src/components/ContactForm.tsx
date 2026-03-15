"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { sendGAEvent } from "@next/third-parties/google";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { FaWhatsapp } from "react-icons/fa";
import { QrCode } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";

import { getGclidFromCookie } from "@/lib/gclid";
import posthog from "posthog-js";

export function ContactForm() {
    const [open, setOpen] = useState(false);
    const whatsappUrl = useWhatsappUrl();
    const { getElapsedTime } = useTimeToAction();

    const handleOpen = () => {
        setOpen(true);
        const gclid = getGclidFromCookie();

        sendGAEvent("event", "qr_code_open", {
            source: "hero_qr_cta",
            time_to_click_ms: getElapsedTime() || 0,
            ...(gclid ? { gclid } : {}),
        });
        posthog.capture("qr_code_opened", {
            source: "hero_qr_cta",
            time_to_click_ms: getElapsedTime() || 0,
            ...(gclid ? { gclid } : {}),
        });

        // Fire GCLID lead — only for paid traffic, server deduplicates
        if (gclid) {
            const data = JSON.stringify({ gclid });
            const sent = navigator.sendBeacon
                ? navigator.sendBeacon('/api/leads', new Blob([data], { type: 'application/json' }))
                : false;
            if (!sent) {
                fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: data,
                    keepalive: true,
                }).catch(() => { });
            }
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <Button
                onClick={handleOpen}
                className="bg-white hover:bg-white/90 text-primary px-8 py-4 rounded-md text-lg font-bold transition-all shadow-lg inline-flex items-center justify-center gap-2 h-auto w-full"
            >
                <QrCode className="w-5 h-5" />
                Escanear QR Code
            </Button>

            {/* QR Code Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader className="text-center items-center">
                        <DialogTitle className="text-xl text-slate-900">
                            Abra o WhatsApp no celular
                        </DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Aponte a câmera do celular para o QR Code abaixo para abrir a conversa direto com o João.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-4 py-2">
                        {/* QR Code with WhatsApp icon overlay */}
                        <div className="relative inline-flex p-4 bg-white rounded-2xl shadow-md border border-slate-100">
                            <QRCodeSVG
                                value={whatsappUrl}
                                size={200}
                                bgColor="#ffffff"
                                fgColor="#111827"
                                level="M"
                                marginSize={1}
                            />
                            {/* WhatsApp icon centered over the QR quiet zone */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-white rounded-full p-1.5 shadow-sm">
                                    <FaWhatsapp className="w-8 h-8 text-[#25D366]" />
                                </div>
                            </div>
                        </div>

                        <p className="text-slate-500 text-xs text-center flex items-center gap-1">
                            Ou <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium inline-flex items-center gap-1"><FaWhatsapp className="w-3.5 h-3.5" /> clique aqui</a> se estiver no celular.
                        </p>
                    </div>

                    <div className="flex justify-center pt-1">
                        <DialogClose asChild>
                            <Button variant="outline" className="w-full">Fechar</Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>

            {/*
            ============================================================
            CONTACT FORM — preserved for future use (commented out)
            CFP/CEPP + LGPD compliant form with name, phone, consent.
            Requires: Contatos Payload collection + submit-contact action.
            ============================================================

            import { useState, useRef } from "react";
            import { submitContact } from "@/app/(website)/actions/submit-contact";
            import { useTimeToAction } from "@/hooks/use-time-to-action";
            import { Checkbox } from "./ui/checkbox";
            import { Input } from "./ui/input";
            import Link from "next/link";

            function applyPhoneMask(value: string): string {
                const digits = value.replace(/\D/g, "").slice(0, 11);
                if (digits.length <= 2) return digits.length ? `(${digits}` : "";
                if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                if (digits.length <= 10)
                    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
            }

            // State:
            // const [name, setName] = useState("");
            // const [phone, setPhone] = useState("");
            // const [consent, setConsent] = useState(false);
            // const [isSubmitting, setIsSubmitting] = useState(false);
            // const [showSuccess, setShowSuccess] = useState(false);
            // const [error, setError] = useState("");
            // const nameRef = useRef<HTMLInputElement>(null);

            // canSubmit: name.trim().length >= 2 && phone digits >= 10 && consent && !isSubmitting

            // handleSubmit: validates, calls submitContact(), fires generate_qualified_lead GA4 event,
            // shows success dialog with Instagram + Blog links on success.

            // Dialog trigger text: "Deixar meu contato"       icon: Phone
            // Form title: "Entre em contato com o João"
            // Form description: "Preencha o formulário e o João entrará em contato para esclarecer dúvidas sobre os atendimentos."
            // Fields: Nome completo (text), Telefone com DDD (tel, masked)
            // Consent checkbox label: "Li e concordo com a Política de Privacidade e autorizo o contato de
            //   João Vitor Fernandes Domingues, CRP 06/157908, para esclarecimento de dúvidas sobre atendimento."
            // Submit button: "Enviar" / "Enviando..."
            // Success dialog: Instagram follow + Blog read links
            */}
        </>
    );
}
