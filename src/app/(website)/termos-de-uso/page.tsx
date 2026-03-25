
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
                    O conteúdo disponibilizado neste site tem finalidade <strong>exclusivamente informativa e educativa</strong>. Os textos e materiais aqui presentes não substituem, em hipótese alguma, o aconselhamento, avaliação ou acompanhamento profissional de um psicólogo ou médico.
                </p>
                <p className="mb-4">
                    Se você estiver enfrentando problemas de saúde mental ou situações de crise, procure ajuda profissional imediatamente ou entre em contato com os serviços de emergência (como o CVV — ligue 188).
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. Propriedade Intelectual</h2>
                <p className="mb-4">
                    Todo o conteúdo deste site (textos, imagens, logotipos) é de propriedade de João Vitor Fernandes Domingues, exceto quando indicado o contrário. É proibida a reprodução total ou parcial sem autorização prévia por escrito.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Limitação de Responsabilidade</h2>
                <p className="mb-4">
                    Embora nos esforcemos para manter as informações atualizadas e corretas, não garantimos a precisão, integridade ou atualidade de todo o conteúdo. O uso das informações contidas neste site é de inteira responsabilidade do usuário.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Comentários do Blog</h2>
                <p className="mb-4">
                    Este site permite o cadastro voluntário de usuários para participação nos comentários dos artigos do blog. Ao criar uma conta e publicar comentários, o usuário concorda com as seguintes condições:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Os comentários devem ser respeitosos e pertinentes ao conteúdo dos artigos.</li>
                    <li>É proibido publicar conteúdo ofensivo, discriminatório, ilegal ou que viole direitos de terceiros.</li>
                    <li>Os comentários passam por moderação antes de serem publicados.</li>
                    <li>O nome de exibição escolhido no cadastro será exibido publicamente junto ao comentário.</li>
                    <li>O responsável pelo site reserva-se o direito de recusar ou remover comentários que violem estas condições.</li>
                </ul>
                <p className="mb-4">
                    Para informações sobre coleta e tratamento dos dados de cadastro, consulte nossa{" "}
                    <Link href="/politica-de-privacidade" className="text-blue-600 hover:underline">Política de Privacidade</Link>.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Newsletter</h2>
                <p className="mb-4">
                    A inscrição na newsletter é voluntária e visa exclusivamente o envio de notificações sobre novos artigos publicados no blog.
                    Não há uso comercial ou compartilhamento dos dados com terceiros.
                    O cancelamento pode ser feito a qualquer momento pelo link presente nos e-mails recebidos ou pela página{" "}
                    <a href="/conta" className="text-blue-600 hover:underline">Minha Conta</a>.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">6. Cookies e Análise de Uso</h2>
                <p className="mb-4">
                    Este site utiliza cookies e ferramentas de análise (Google Analytics 4 e PostHog) para fins estatísticos e de melhoria da experiência.
                    Os dados coletados são anônimos e não permitem a identificação individual dos visitantes.
                </p>
                <p className="mb-4">
                    Quando o acesso ao site ocorre por meio de anúncios do Google Ads, um cookie pseudônimo (GCLID) pode ser armazenado no seu navegador por até 30 dias para fins de mensuração de conversão.
                    Para mais detalhes sobre o uso de cookies, consulte nossa{" "}
                    <Link href="/politica-de-privacidade" className="text-blue-600 hover:underline">Política de Privacidade</Link>.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contato</h2>
                <p className="mb-4">
                    Para questões relacionadas a estes termos, entre em contato através do e-mail:{" "}
                    <a href="mailto:joao@psicologojoaofernandes.com" className="text-blue-600 hover:underline">joao@psicologojoaofernandes.com</a>.
                </p>

                <p className="mt-8 text-sm text-slate-500">
                    Estes termos são efetivos a partir de {new Date().getFullYear()}. Última atualização: março de 2026.
                </p>
            </div>
        </main>
    );
}
