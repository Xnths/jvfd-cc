import { TreatmentPage } from "@/components/TreatmentPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Supervisão Clínica em Psicologia | João Fernandes",
    description: "Supervisão clínica em Análise do Comportamento para psicólogos e estudantes. Discução de casos, ética e desenvolvimento técnico.",
};

export default function SupervisionPage() {
    return (
        <TreatmentPage
            title="Supervisão para Psicólogos"
            subtitle="Desenvolvimento técnico e pessoal para psicólogos e estudantes de psicologia, fundamentado na Análise do Comportamento."
        >
            <div className="space-y-8 text-lg text-slate-700 leading-relaxed">
                <p>
                    A prática clínica pode ser desafiadora. A supervisão oferece um espaço de
                    troca e aprofundamento, essencial para o aprimoramento da atuação
                    profissional e para a segurança do paciente.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    O Foco da Supervisão
                </h2>
                <p>
                    Minha abordagem na supervisão é baseada na <strong>Análise do Comportamento</strong>,
                    buscando unir teoria e prática de forma ética e eficiente. Discutimos:
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-600">
                    <li>Conceitos fundamentais da Análise do Comportamento Aplicada (ABA) e Clínica.</li>
                    <li>Formulações de caso (análise funcional).</li>
                    <li>Planejamento terapêutico e estratégias de intervenção.</li>
                    <li>Manejo de situações de crise e impasses terapêuticos.</li>
                    <li>Questões éticas e legais da profissão.</li>
                    <li>Relação terapêutica e autocuidado do terapeuta.</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">
                    Modalidades
                </h2>
                <p>
                    A supervisão pode ser realizada individualmente ou em pequenos grupos,
                    presencialmente ou online, adaptando-se às necessidades de cada
                    profissional.
                </p>
                <ul className="list-disc pl-6 space-y-2 marker:text-cyan-600">
                    <li>Supervisão pontual para casos específicos.</li>
                    <li>Acompanhamento continuado para desenvolvimento profissional.</li>
                    <li>Supervisão para estudantes iniciantes na clínica.</li>
                </ul>

                <div className="bg-cyan-50 p-6 rounded-lg border-l-4 border-cyan-600 mt-8">
                    <p className="italic text-cyan-900 font-medium">
                        "A supervisão não é apenas sobre corrigir erros, mas sobre ampliar o
                        olhar clínico, validar a competência e construir uma identidade
                        profissional sólida e ética."
                    </p>
                </div>
            </div>
        </TreatmentPage>
    );
}
