import { TreatmentPage } from "@/components/TreatmentPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tratamento para Depressão | Psicólogo João Fernandes",
    description: "Entenda os sinais e sintomas da depressão e como a Terapia Comportamental pode ajudar a recuperar o sentido da vida.",
};

export default function DepressionPage() {
    return (
        <TreatmentPage
            title="Sinais de Depressão e Tratamento"
            subtitle="Identifique os sinais e encontre um caminho para o bem-estar com a Terapia Comportamental."
        >
            <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                <p>
                    A depressão não é apenas tristeza passageira; é um transtorno que afeta
                    profundamente a capacidade de sentir prazer, a energia e o sentido de
                    valor próprio. Compreender seus sinais é o primeiro passo para o
                    tratamento.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Sinais Comuns da Depressão
                </h2>
                <p>
                    Os sintomas podem variar de pessoa para pessoa, mas frequentemente
                    incluem:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-blue-600">
                    <li>Tristeza persistente, ansiedade ou sensação de "vazio".</li>
                    <li>Perda de interesse em atividades que antes eram prazerosas (anedonia).</li>
                    <li>Alterações no apetite ou no peso.</li>
                    <li>Dificuldade para dormir ou dormir excessivamente.</li>
                    <li>Fadiga e falta de energia.</li>
                    <li>Sentimentos de inutilidade ou culpa excessiva.</li>
                    <li>Dificuldade de concentração e tomada de decisões.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Como a Terapia Comportamental Ajuda?
                </h2>
                <p>
                    A Terapia Comportamental, especialmente a **Ativação Comportamental**, é
                    altamente eficaz para a depressão. O foco está em quebrar o ciclo de
                    inatividade e desesperança através de ações concretas e graduais.
                </p>
                <p>
                    Juntos, vamos:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-blue-600">
                    <li>Identificar padrões de comportamento e pensamentos negativos.</li>
                    <li>Planejar atividades que tragam prazer e senso de realização.</li>
                    <li>Superar a inércia e a falta de motivação.</li>
                    <li>Desenvolver habilidades para lidar com situações difíceis.</li>
                </ul>

                <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500 mt-8">
                    <p className="italic text-slate-800 font-medium">
                        "A recuperação começa com um pequeno passo. Não é preciso fazer tudo de
                        uma vez, mas sim caminhar na direção certa, com suporte profissional."
                    </p>
                </div>
            </div>
        </TreatmentPage>
    );
}
