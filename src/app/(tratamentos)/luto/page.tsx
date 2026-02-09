import { TreatmentPage } from "@/components/TreatmentPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Acolhimento no Luto | Psicólogo João Fernandes",
    description: "Encontre apoio e compreensão durante o processo de luto. Um espaço seguro para processar a perda e reconstruir o significado.",
};

export default function GriefPage() {
    return (
        <TreatmentPage
            title="Acolhimento no Luto"
            subtitle="Um espaço seguro para processar a perda, viver as emoções e reconstruir o significado sem julgamentos."
        >
            <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                <p>
                    O luto é uma resposta natural e esperada à perda de alguém significativo,
                    mas pode ser uma das experiências mais dolorosas da vida. Embora seja
                    individual e não linear, o luto pode trazer sentimentos intensos de
                    tristeza, raiva, culpa e confusão.
                </p>
                <p>
                    Aqui, você encontrará um ambiente acolhedor e confidencial para expressar
                    sua dor e começar o processo de cura.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    O Papel da Terapia no Luto
                </h2>
                <p>
                    A terapia não "apaga" a dor da perda, mas ajuda a acomodá-la e a
                    integrá-la à sua vida. Ela oferece:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-purple-600">
                    <li>Alívio em compartilhar sentimentos difíceis sem medo de ser julgado.</li>
                    <li>Compreensão sobre o que é normal e esperado no processo de luto.</li>
                    <li>Identificação de estratégias para lidar com datas comemorativas e lembranças.</li>
                    <li>Respeito ao seu ritmo pessoal, sem pressa para "superar".</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Reconstruindo o Significado
                </h2>
                <p>
                    Com o tempo e o suporte adequado, é possível encontrar novas formas de se
                    relacionar com a memória de quem partiu e, gradualmente, reinvestir
                    energia na própria vida. O objetivo não é o esquecimento, mas a
                    transformação da dor em uma lembrança que não paralise o presente.
                </p>

                <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-600 mt-8 shadow-sm">
                    <p className="italic text-purple-900 font-medium">
                        "Não existe 'jeito certo' de viver o luto. Existe o seu jeito, no seu
                        tempo. E eu estou aqui para caminhar ao seu lado."
                    </p>
                </div>
            </div>
        </TreatmentPage>
    );
}
