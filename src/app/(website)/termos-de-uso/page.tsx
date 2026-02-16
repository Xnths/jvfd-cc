
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Termos de Uso | Psicólogo João Fernandes",
    description: "Termos de Uso do site do Psicólogo João Fernandes. Informações sobre o caráter informativo do conteúdo.",
};

export default function TermsOfUsePage() {
    return (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-slate-900">Termos de Uso</h1>

            <div className="prose prose-slate max-w-none text-slate-700">
                <p className="mb-4">
                    Bem-vindo ao site do Psicólogo João Fernandes. Ao acessar e utilizar este site, você concorda com os seguintes termos e condições de uso.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Caráter Informativo</h2>
                <p className="mb-4">
                    O conteúdo disponibilizado neste site tem finalidade <strong>exclusivamente informativa e educativa</strong>. Os textos, vídeos e materiais aqui presentes não substituem, em hipótese alguma, o aconselhamento, avaliação ou acompanhamento profissional de um psicólogo ou médico.
                </p>
                <p className="mb-4">
                    Se você estiver enfrentando problemas de saúde mental ou situações de crise, procure ajuda profissional imediatamente ou entre em contato com os serviços de emergência (como o CVV - 188).
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. Propriedade Intelectual</h2>
                <p className="mb-4">
                    Todo o conteúdo deste site (textos, imagens, logotipos) é de propriedade de João Vitor Fernandes, exceto quando indicado o contrário. É proibida a reprodução total ou parcial sem autorização prévia.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Limitação de Responsabilidade</h2>
                <p className="mb-4">
                    Embora nos esforcemos para manter as informações atualizadas e corretas, não garantimos a precisão, integridade ou atualidade de todo o conteúdo. O uso das informações contidas neste site é de inteira responsabilidade do usuário.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Contato</h2>
                <p className="mb-4">
                    Para questões relacionadas a estes termos, entre em contato através do e-mail: <a href="mailto:jvfd2014@hotmail.com" className="text-blue-600 hover:underline">jvfd2014@hotmail.com</a>.
                </p>

                <p className="mt-8 text-sm text-slate-500">
                    Estes termos são efetivos a partir de {new Date().getFullYear()}.
                </p>
            </div>
        </main>
    );
}
