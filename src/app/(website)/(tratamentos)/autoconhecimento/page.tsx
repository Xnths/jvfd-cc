import { TreatmentPage } from "@/components/TreatmentPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Autoconhecimento e Entendimento | Psicólogo João Fernandes",
    description: "Entenda a si mesmo, seus sentimentos e comportamentos. A Terapia Comportamental oferece um caminho para o autodesenvolvimento e clareza emocional.",
};

export default function SelfKnowledgePage() {
    return (
        <TreatmentPage
            title="Autoconhecimento e Entendimento"
            subtitle="A jornada de descoberta e compreensão dos próprios sentimentos, pensamentos e comportamentos."
        >
            <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                <p>
                    Muitas vezes, sentimos angústias indefinidas, reagimos de formas que não
                    gostaríamos ou simplesmente temos dúvidas sobre quem somos e o que
                    desejamos. O autoconhecimento é a chave para uma vida mais autêntica e
                    satisfatória.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    O Que É Autoconhecimento?
                </h2>
                <p>
                    Não é apenas "saber quem você é" em termos abstratos. É compreender como
                    sua história de vida moldou suas reações atuais. É a capacidade de:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-violet-600">
                    <li>Identificar e nomear emoções com mais precisão.</li>
                    <li>Reconhecer padrões de comportamento que se repetem.</li>
                    <li>Entender como o ambiente influencia suas escolhas.</li>
                    <li>Perceber seus valores e o que é importante para você.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Como a Terapia Ajuda?
                </h2>
                <p>
                    A terapia é um processo estruturado de auto-observação guiada. Com a ajuda
                    do psicólogo, você aprende a olhar para si mesmo com curiosidade, sem
                    julgamento, e a fazer as perguntas certas.
                </p>
                <p>
                    Isso permite:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-violet-600">
                    <li>Tomar decisões mais conscientes e alinhadas com seus objetivos.</li>
                    <li>Melhorar seus relacionamentos interpessoais.</li>
                    <li>Desenvolver maior resiliência emocional.</li>
                    <li>Superar medos e limitações que antes pareciam intransponíveis.</li>
                </ul>

                <div className="bg-violet-50 p-6 rounded-lg border-l-4 border-violet-600 mt-8">
                    <p className="italic text-violet-900 font-medium">
                        "Autoconhecimento é liberdade. Quando você entende por que faz o que faz,
                        pode escolher fazer diferente."
                    </p>
                </div>
            </div>
        </TreatmentPage>
    );
}
