"use client"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const faq = [
    {
        id: "item-1",
        question: "Como funciona a primeira sessão?",
        answer:
            "A primeira sessão é um contato inicial para mapear demandas, esclarecer o funcionamento do atendimento e estabelecer as condições do processo terapêutico.",
    },
    {
        id: "item-2",
        question: "O atendimento é presencial ou online?",
        answer:
            "O atendimento pode ocorrer de forma online ou presencial, conforme a organização do serviço e a disponibilidade acordada.",
    },
    {
        id: "item-3",
        question: "Qual a duração das sessões?",
        answer:
            "As sessões têm duração média de 50 minutos, ocorrendo em frequência semanal, salvo rearranjos previamente combinados.",
    },
    {
        id: "item-4",
        question: "As sessões são sigilosas?",
        answer:
            "Sim. O sigilo é mantido conforme as normas éticas da prática profissional, com exceção das condições previstas em regulamentação.",
    },
    {
        id: "item-5",
        question: "Como funciona o cancelamento?",
        answer:
            "Cancelamentos devem ser comunicados com antecedência mínima, conforme acordado, para evitar a cobrança da sessão.",
    },
];

export function FAQ() {
    return (
        <section className="w-full max-w-3xl mx-auto px-4 py-16">
            <h2 className="text-3xl font-semibold mb-8 text-center">
                Perguntas Frequentes
            </h2>
            <Accordion type="single" collapsible className="w-full">
                {faq.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent>{item.answer}</AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </section>
    );
}
