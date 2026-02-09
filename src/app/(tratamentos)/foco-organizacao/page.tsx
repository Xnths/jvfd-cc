import { TreatmentPage } from "@/components/TreatmentPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Foco e Organização | Psicólogo João Fernandes",
    description: "Dificuldades de concentração e organização podem impactar a vida pessoal e profissional. Descubra como a Terapia Comportamental pode ajudar a melhorar seu foco e produtividade.",
};

export default function FocusOrganizationPage() {
    return (
        <TreatmentPage
            title="Foco e Organização"
            subtitle="Estratégias práticas para superar a procrastinação, melhorar a concentração e gerenciar o tempo de forma eficaz."
        >
            <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                <p>
                    A dificuldade de manter o foco e a organização não é apenas uma questão de
                    força de vontade. Fatores ambientais, emocionais e comportamentais podem
                    interferir diretamente na capacidade de realizar tarefas e alcançar metas.
                    Se a sua rotina parece caótica ou se o rendimento caiu, a Terapia
                    Comportamental pode oferecer ferramentas valiosas.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Identificando as Barreiras
                </h2>
                <p>
                    O primeiro passo é entender o que está atrapalhando. Nem sempre a causa é
                    óbvia. Pode ser ansiedade, perfeccionismo, falta de clareza nas metas ou
                    até mesmo um ambiente inadequado. Na terapia, investigamos:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-emerald-600">
                    <li>Quais gatilhos levam à procrastinação ou dispersão.</li>
                    <li>Como o ambiente influencia seu comportamento.</li>
                    <li>Se há expectativas irreais que geram paralisação.</li>
                    <li>Padrões de autocobrança excessiva.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Desenvolvendo Novas Habilidades
                </h2>
                <p>
                    Com base na Análise do Comportamento, trabalhamos na construção de um
                    repertório que favoreça a produtividade saudável, respeitando seu ritmo e
                    limites. Isso inclui:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-emerald-600">
                    <li>Técnicas de gerenciamento de tempo e priorização.</li>
                    <li>Organização do ambiente físico e digital.</li>
                    <li>Quebra de grandes tarefas em passos menores e realizáveis.</li>
                    <li>Reforço positivo para pequenas conquistas.</li>
                </ul>

                <div className="bg-emerald-50 p-6 rounded-lg border-l-4 border-emerald-600 mt-8">
                    <p className="italic text-emerald-900 font-medium">
                        "Organização não é sobre rigidez, mas sobre criar espaço mental e físico
                        para o que realmente importa na sua vida."
                    </p>
                </div>
            </div>
        </TreatmentPage>
    );
}
