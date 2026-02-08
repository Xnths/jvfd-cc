"use client";

import { useSectionAnalytics } from "@/hooks/use-section-analytics";

const faq = [
    {
        id: "item-2",
        question: "O atendimento é presencial ou online?",
        answer:
            "Como você preferir. O atendimento online acontece por videochamada segura, ideal para quem precisa de flexibilidade ou está longe. O presencial ocorre no consultório na Vila Madalena, SP. Ambos têm a mesma qualidade e eficácia.",
    },
    {
        id: "item-1",
        question: "Como funciona a primeira sessão?",
        answer:
            "É um momento para nos conhecermos, sem pressão. Você poderá me contar o que o trouxe à terapia, suas dúvidas e expectativas. Eu explicarei como trabalho e juntos definiremos os próximos passos.",
    },
    {
        id: "item-3",
        question: "Qual a duração da terapia?",
        answer:
            "Cada processo é único. As sessões duram cerca de 50 minutos e geralmente são semanais. A duração total do tratamento varia conforme seus objetivos e necessidades, tudo alinhado com transparência entre nós.",
    },
    {
        id: "item-4",
        question: "Aceita convênios?",
        answer:
            "O atendimento é particular, mas forneço recibos para reembolso no seu plano de saúde.",
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
