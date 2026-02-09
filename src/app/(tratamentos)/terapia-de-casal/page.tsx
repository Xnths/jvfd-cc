import { TreatmentPage } from "@/components/TreatmentPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terapia de Casal | Psicólogo João Fernandes",
    description: "Melhore a comunicação e o relacionamento do casal com a Terapia Comportamental. Resolva conflitos e fortaleça a união.",
};

export default function CouplesTherapyPage() {
    return (
        <TreatmentPage
            title="Terapia de Casal"
            subtitle="Reconstruindo a conexão e a harmonia através de comunicação assertiva e mudanças práticas."
        >
            <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                <p>
                    Relacionamentos íntimos são complexos e, por vezes, enfrentam desafios
                    significativos que podem desgastar a conexão. A Terapia de Casal oferece
                    um espaço neutro e estruturado para abordar conflitos, melhorar a
                    comunicação e fortalecer o vínculo.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Quando Procurar Terapia de Casal?
                </h2>
                <p>
                    Não é necessário esperar que a situação se torne insustentável. Muitos
                    casais buscam terapia para prevenir crises maiores ou simplesmente para
                    crescerem juntos. Indicadores comuns incluem:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-rose-500">
                    <li>Dificuldade constante de comunicação ou discussões frequentes.</li>
                    <li>Sentimento de distância emocional ou falta de intimidade.</li>
                    <li>Desafios com a confiança (como infidelidade ou ciúmes).</li>
                    <li>Diferenças significativas em valores, planos de vida ou criação de filhos.</li>
                    <li>Sensação de que "conversar não resolve mais".</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Como Funciona o Processo?
                </h2>
                <p>
                    A abordagem comportamental na terapia de casal foca em identificar os
                    padrões de interação que mantêm os problemas e em desenvolver novas
                    formas de se relacionar.
                </p>
                <p>
                    Nós trabalhamos para:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-rose-500">
                    <li>Facilitar a comunicação clara e a escuta ativa.</li>
                    <li>Promover a empatia e a validação mútua.</li>
                    <li>Negociar mudanças de comportamento de forma colaborativa.</li>
                    <li>Resgatar a admiração e o carinho mútuo.</li>
                </ul>

                <div className="bg-rose-50 p-6 rounded-lg border-l-4 border-rose-500 mt-8">
                    <p className="italic text-rose-900 font-medium">
                        "A terapia não se trata apenas de 'salvar' o relacionamento, mas de
                        construir uma parceria saudável e satisfatória para ambos."
                    </p>
                </div>
            </div>
        </TreatmentPage>
    );
}
