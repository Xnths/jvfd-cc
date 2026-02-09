import { TreatmentPage } from "@/components/TreatmentPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Psicoterapia Individual | Psicólogo João Fernandes",
    description: "A psicoterapia é um espaço seguro de escuta ativa e acolhimento. Trabalhe suas angústias, melhore sua saúde mental e encontre novas perspectivas.",
};

export default function PsychotherapyPage() {
    return (
        <TreatmentPage
            title="Psicoterapia Individual"
            subtitle="Um espaço dedicado a você, onde escuta ativa e ciência se encontram para promover bem-estar e autoconhecimento."
        >
            <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                <p>
                    A vida traz desafios que, muitas vezes, parecem pesados demais para
                    carregar sozinho. A psicoterapia não é sinal de fraqueza, mas de coragem
                    para olhar para si mesmo e buscar mudanças.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Como Funciona?
                </h2>
                <p>
                    As sessões são encontros semanais onde você tem total liberdade para falar
                    sobre o que quiser, em um ambiente confidencial e livre de julgamentos.
                    Meu papel é ajudar a identificar padrões, questionar crenças limitantes e
                    construir novas formas de agir no mundo.
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-indigo-600">
                    <li>Acolhimento das suas dores e angústias.</li>
                    <li>Compreensão da sua história de vida e contexto atual.</li>
                    <li>Definição conjunta de objetivos terapêuticos.</li>
                    <li>Foco no presente e na construção de um futuro com mais sentido.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Para Quem é Indicado?
                </h2>
                <p>
                    Para qualquer pessoa que sinta necessidade de apoio emocional, seja para
                    lidar com um transtorno específico (como ansiedade ou depressão) ou para
                    questões existenciais, transições de vida e desenvolvimento pessoal.
                </p>

                <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-600 mt-8">
                    <p className="italic text-indigo-900 font-medium">
                        "Não é preciso estar 'doente' para fazer terapia. Basta querer viver
                        melhor consigo mesmo e com os outros."
                    </p>
                </div>
            </div>
        </TreatmentPage>
    );
}
