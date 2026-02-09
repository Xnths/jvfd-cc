import { TreatmentPage } from "@/components/TreatmentPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terapia para Ansiedade | Psicólogo João Fernandes",
    description: "Descubra como a Terapia Comportamental ajuda no tratamento da ansiedade. Aprenda a lidar com crises, preocupação excessiva e retome sua qualidade de vida.",
};

export default function AnxietyPage() {
    return (
        <TreatmentPage
            title="Ansiedade sob Controle"
            subtitle="Como a Terapia Comportamental pode ajudar você a entender e gerenciar a ansiedade de forma eficaz."
        >
            <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                <p>
                    A ansiedade é uma reação natural do corpo ao estresse, mas quando se torna
                    constante e excessiva, pode prejudicar significativamente a qualidade de vida.
                    No consultório, utilizamos a <strong>Terapia Comportamental</strong> para
                    entender as raízes dessa ansiedade e desenvolver estratégias práticas para
                    lidar com ela.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Como a Terapia Comportamental Funciona?
                </h2>
                <p>
                    A abordagem comportamental foca na relação entre o que sentimos, pensamos e
                    como agimos. Ao identificar os gatilhos que disparam a ansiedade e os
                    comportamentos que a mantêm, trabalhamos juntos para:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-blue-600">
                    <li>Reconhecer e modificar padrões de pensamento disfuncionais.</li>
                    <li>Desenvolver habilidades de enfrentamento para situações estressantes.</li>
                    <li>Utilizar técnicas de relaxamento e atenção plena (mindfulness).</li>
                    <li>Expor-se gradualmente a situações temidas em um ambiente seguro.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Benefícios do Tratamento
                </h2>
                <p>
                    O objetivo não é apenas "eliminar" a ansiedade, mas sim aprender a conviver
                    com ela de maneira saudável, sem que ela paralise suas ações. Com o tempo,
                    os pacientes relatam:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-blue-600">
                    <li>Maior sensação de controle sobre as próprias emoções.</li>
                    <li>Melhora na qualidade do sono e na concentração.</li>
                    <li>Redução de sintomas físicos como taquicardia e tensão muscular.</li>
                    <li>Retomada de atividades prazerosas que foram deixadas de lado.</li>
                </ul>

                <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-blue-600 mt-8">
                    <p className="italic text-slate-600">
                        "A terapia oferece ferramentas para que você não seja refém dos seus
                        próprios sentimentos, permitindo uma vida mais leve e produtiva."
                    </p>
                </div>
            </div>
        </TreatmentPage>
    );
}
