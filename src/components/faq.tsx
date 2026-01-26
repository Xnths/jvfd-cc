"use client";

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
