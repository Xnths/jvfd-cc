
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Política de Privacidade | Psicólogo João Fernandes",
    description: "Política de Privacidade do site do Psicólogo João Fernandes. Saiba como seus dados são coletados e protegidos.",
};

export default function PrivacyPolicyPage() {
    return (
        <main className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-slate-900">Política de Privacidade</h1>

            <div className="prose prose-slate max-w-none text-slate-700">
                <p className="mb-4">
                    A sua privacidade é importante para nós. Esta política descreve como o site do{" "}
                    <Link href="/" className="text-blue-600 hover:underline">Psicólogo João Fernandes</Link>{" "}
                    coleta, usa e protege os seus dados pessoais.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Coleta de Dados</h2>
                <p className="mb-4">
                    Este site oferece duas formas de contato:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>
                        <strong>Botão do WhatsApp:</strong> Redireciona para o aplicativo de mensagens. Nenhum dado é armazenado em nossos servidores por meio desta interação.
                    </li>
                    <li>
                        <strong>Formulário de contato:</strong> Mediante consentimento explícito, coletamos <strong>nome completo</strong> e <strong>número de telefone</strong> do visitante, exclusivamente para que o profissional João Vitor Fernandes Domingues entre em contato para esclarecimento de dúvidas sobre atendimento.
                    </li>
                </ul>
                <p className="mb-4">
                    Os dados submetidos pelo formulário são armazenados de forma segura e criptografada em trânsito, sendo acessíveis <strong>exclusivamente pelo profissional João Vitor Fernandes Domingues (CRP 06/157908)</strong>.
                    O responsável técnico pelo sistema <strong>não possui acesso</strong> a esses dados.
                    Os dados não serão compartilhados com terceiros ou utilizados para fins de marketing.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. Base Legal (LGPD — Lei 13.709/2018)</h2>
                <p className="mb-4">
                    O tratamento dos dados pessoais coletados pelo formulário de contato é fundamentado no{" "}
                    <strong>consentimento livre, informado e inequívoco</strong> do titular (Art. 7º, inciso I, da LGPD).
                    O visitante pode retirar seu consentimento a qualquer momento, solicitando a exclusão de seus dados por meio do e-mail do profissional.
                </p>
                <p className="mb-4">
                    Os dados serão retidos apenas pelo tempo necessário para a finalidade declarada e excluídos após o encerramento da comunicação inicial.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Uso de Cookies e Estatísticas</h2>
                <p className="mb-4">
                    Utilizamos o <strong>Google Analytics</strong> para coletar informações anônimas e estatísticas sobre o uso do site, como o tempo de permanência nas páginas, a origem do tráfego e cliques em botões.
                </p>
                <p className="mb-4">
                    Esses dados são utilizados exclusivamente para fins analíticos e não permitem a identificação de visitantes individualmente.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Dados do Profissional Responsável</h2>
                <p className="mb-4">
                    <strong>João Vitor Fernandes Domingues</strong><br />
                    Psicólogo Clínico — CRP 06/157908<br />
                    Atendimento pautado no Código de Ética Profissional do Psicólogo.<br />
                    E-mail: <a href="mailto:jvfd2014@hotmail.com" className="text-blue-600 hover:underline">jvfd2014@hotmail.com</a> /{" "}
                    <a href="mailto:fernandesdominguesjoaovitor@gmail.com" className="text-blue-600 hover:underline">fernandesdominguesjoaovitor@gmail.com</a><br />
                    Telefone: <a href="tel:+5511955591996" className="text-blue-600 hover:underline">(11) 95559-1996</a><br />
                    Currículo Lattes:{" "}
                    <a href="https://lattes.cnpq.br/2507330776380191" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Acessar Currículo</a>
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Responsável Técnico pelo Sistema</h2>
                <p className="mb-4">
                    O desenvolvimento e a manutenção técnica deste site são de responsabilidade de{" "}
                    <Link href="https://github.com/Xnths" className="text-blue-600 hover:underline">Jonathas Castilho</Link>,
                    desenvolvedor de software, sócio da <Link href="https://blog.xnths.com" className="text-blue-600 hover:underline">J. Tecnologia LTDA.</Link> (CNPJ 55.397.211/0001-00).
                    Contato: <a href="mailto:jonathas@xnths.com" className="text-blue-600 hover:underline">jonathas@xnths.com</a>.
                </p>
                <p className="mb-4">
                    O responsável técnico <strong>não possui acesso</strong> aos dados pessoais submetidos pelo formulário de contato. Esses dados são de acesso exclusivo do profissional psicólogo identificado na seção 4.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">6. Seus Direitos</h2>
                <p className="mb-4">
                    Nos termos da LGPD, você tem direito a: confirmar a existência do tratamento de seus dados; acessar os dados coletados; solicitar sua correção ou exclusão; revogar o consentimento a qualquer momento.
                    Para exercer esses direitos, entre em contato diretamente com o profissional pelo e-mail listado na seção 4.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">7. Consentimento</h2>
                <p className="mb-4">
                    Ao utilizar o formulário de contato deste site, você concorda com esta Política de Privacidade e autoriza o tratamento dos seus dados conforme descrito.
                </p>

                <p className="mt-8 text-sm text-slate-500">
                    Esta política é efetiva a partir de {new Date().getFullYear()}. Última atualização: fevereiro de 2026.
                </p>
            </div>
        </main>
    );
}
