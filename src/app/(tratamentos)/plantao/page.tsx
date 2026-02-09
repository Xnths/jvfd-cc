import { TreatmentPage } from "@/components/TreatmentPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Acolhimento Imediato e Crises | Psicólogo João Fernandes",
    description: "Suporte psicológico para momentos de crise intensa, luto ou extrema ansiedade. Encontre um espaço seguro para estabilizar suas emoções.",
};

export default function CrisisPage() {
    return (
        <TreatmentPage
            title="Acolhimento Imediato"
            subtitle="Suporte focado e acolhedor para momentos de intensa turbulência emocional, quando esperar não é uma opção."
        >
            <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                <p>
                    Alguns momentos da vida nos tiram o chão. Pode ser uma perda repentina,
                    o fim de um relacionamento, uma crise de pânico ou uma situação traumática.
                    Nessas horas, o objetivo principal é o acolhimento e a estabilização.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Intervenção em Crise
                </h2>
                <p>
                    Diferente da terapia convencional de longo prazo, o atendimento em
                    situações de crise foca no "aqui e agora", buscando reduzir o sofrimento
                    agudo e oferecer ferramentas imediatas para lidar com a situação.
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-red-600">
                    <li>Escuta empática para validar a dor e o desespero.</li>
                    <li>Estratégias para regulação emocional e redução da ansiedade.</li>
                    <li>Organização do pensamento em meio ao caos.</li>
                    <li>Encaminhamento para outros profissionais, se necessário (como psiquiatras).</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Você Não Está Sozinho
                </h2>
                <p>
                    Pedir ajuda é o ato mais importante que você pode fazer por si mesmo
                    agora. Ofereço um espaço seguro para que você possa expressar tudo o que
                    está sentindo, sem filtros e sem medos.
                </p>

                <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-600 mt-8">
                    <p className="italic text-red-900 font-medium">
                        "Em meio à tempestade, encontrar um porto seguro pode fazer toda a
                        diferença. Vamos respirar juntos e encontrar o próximo passo."
                    </p>
                </div>
            </div>
        </TreatmentPage>
    );
}
