"use server";

import { getPayload } from "payload";
import configPromise from "@payload-config";

interface SubmitContactResult {
    success: boolean;
    error?: string;
}

export async function submitContact(formData: {
    name: string;
    phone: string;
    consentGiven: boolean;
}): Promise<SubmitContactResult> {
    const { name, phone, consentGiven } = formData;

    // Validate consent — LGPD requires explicit opt-in
    if (!consentGiven) {
        return { success: false, error: "É necessário aceitar a Política de Privacidade para continuar." };
    }

    // Validate name
    if (!name || name.trim().length < 2) {
        return { success: false, error: "Por favor, informe seu nome completo." };
    }

    // Validate phone — 10 or 11 digits (Brazilian)
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
        return { success: false, error: "Número de telefone inválido. Use o formato (XX) 9XXXX-XXXX." };
    }

    try {
        const payload = await getPayload({ config: configPromise });

        await payload.create({
            collection: "contatos",
            data: {
                name: name.trim(),
                phone: digits,
                consentGiven: true,
                consentTimestamp: new Date().toISOString(),
                status: "novo",
            },
        });

        return { success: true };
    } catch (error) {
        console.error("[submitContact] Error:", error);
        return { success: false, error: "Erro ao enviar. Tente novamente ou contate pelo WhatsApp." };
    }
}
