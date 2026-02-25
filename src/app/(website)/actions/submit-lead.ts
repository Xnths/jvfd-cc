"use server";

import { getPayload } from "payload";
import configPromise from "@payload-config";

interface SubmitLeadResult {
    success: boolean;
    error?: string;
}

export async function submitLead(phone: string): Promise<SubmitLeadResult> {
    // Strip everything except digits
    const digits = phone.replace(/\D/g, "");

    // Validate: Brazilian phone numbers have 10 or 11 digits (DDD + number)
    if (digits.length < 10 || digits.length > 11) {
        return { success: false, error: "Número inválido. Use o formato (XX) 9XXXX-XXXX." };
    }

    try {
        const payload = await getPayload({ config: configPromise });

        await payload.create({
            collection: "leads",
            data: {
                phone: digits,
                status: "novo",
            },
        });

        return { success: true };
    } catch (error) {
        console.error("[submitLead] Error:", error);
        return { success: false, error: "Erro ao enviar. Tente novamente." };
    }
}
