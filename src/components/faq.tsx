"use client";

import { useSectionAnalytics } from "@/hooks/use-section-analytics";

const faq = [
    {
        id: "item-2",
        question: "O atendimento é presencial ou online?",
        answer:
            "Os atendimentos podem ser realizados de forma presencial ou online.",
    },
    {
        id: "item-1",
        question: "Como funciona a primeira sessão?",
        answer:
            "A primeira sessão visa um contato inicial para entender as necessidades e esclarecer detalhes do atendimento.",
    },
    {
        id: "item-3",
        question: "Qual a duração das sessões?",
        answer:
            "As sessões têm em média 50 minutos, ocorrendo em frequência semanal, salvo rearranjos previamente combinados.",
    },
    {
        id: "item-4",
        question: "São aceitos convênios?",
        answer:
            "Não, mas há a emissão de recibos que podem ser utilizados para reembolsos em planos de saúde.",
    },
];

export function FAQ() {
    useSectionAnalytics("faq")

    return (
        <section className="w-full max-w-3xl mx-auto px-4 py-16" id="faq">
            <h2 className="text-2xl font-semibold mb-[64px] text-center">
                Perguntas Frequentes
            </h2>

            <ul className="space-y-6">
                {faq.map((item) => (
                    <li
                        key={item.id}
                        className="border-b pb-4"
                    >
                        <h3 className="text-lg font-medium mb-2">
                            {item.question}
                        </h3>
                        <p className="text-muted-foreground">
                            {item.answer}
                        </p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
