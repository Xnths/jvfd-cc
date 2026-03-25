
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
                    coleta, usa e protege os seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Formas de Contato</h2>
                <p className="mb-4">
                    Este site oferece contato exclusivamente via <strong>WhatsApp</strong>, por meio de botão flutuante e QR code disponíveis na página inicial.
                    Ao clicar no botão ou escanear o QR code, você é redirecionado diretamente para o aplicativo WhatsApp.
                    Nenhum dado pessoal é coletado ou armazenado em nossos servidores por meio dessa interação.
                </p>
                <p className="mb-4">
                    Se você chegar ao site por meio de um anúncio do Google Ads, o <strong>identificador de clique do Google (GCLID)</strong> presente na URL é capturado e armazenado em um cookie no seu navegador por até 30 dias.
                    Caso você clique no botão do WhatsApp durante essa sessão, o GCLID é enviado aos nossos servidores exclusivamente para fins de mensuração de conversão de anúncios.
                    Esse identificador é pseudônimo — não é vinculado ao seu nome, e-mail ou telefone.
                    Os dados são mantidos por até 90 dias e utilizados apenas para relatórios de conversão junto ao Google Ads.
                    Você pode desativar o rastreamento de anúncios personalizados nas{" "}
                    <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">configurações de anúncios do Google</a>.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. Base Legal (LGPD — Lei 13.709/2018)</h2>
                <p className="mb-4">
                    Os tratamentos de dados pessoais realizados por este site estão fundamentados nas seguintes bases legais:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Consentimento (Art. 7º, I):</strong> newsletter, cadastro de usuário do blog e registro de LGPD nos formulários.</li>
                    <li><strong>Legítimo interesse (Art. 7º, IX):</strong> análises de uso do site por meio de ferramentas de analytics (GA4 e PostHog), utilizadas exclusivamente para melhoria do conteúdo e da experiência.</li>
                    <li><strong>Execução de contrato (Art. 7º, V):</strong> cookie de autenticação dos usuários cadastrados no blog.</li>
                </ul>
                <p className="mb-4">
                    O visitante pode retirar seu consentimento a qualquer momento, conforme descrito nas seções correspondentes abaixo.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Contas de Usuário do Blog</h2>
                <p className="mb-4">
                    Este site permite o cadastro voluntário de usuários para participação nos comentários dos artigos do blog.
                    Ao criar uma conta, os seguintes dados são coletados:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Nome de exibição:</strong> usado publicamente nos comentários.</li>
                    <li><strong>E-mail:</strong> usado apenas para autenticação e, quando autorizado, para newsletter. Nunca é exibido publicamente.</li>
                    <li><strong>Senha:</strong> armazenada com hash seguro. Não é acessível por ninguém.</li>
                    <li><strong>Data e hora do consentimento LGPD:</strong> registrada automaticamente no cadastro (Art. 7º, I, LGPD).</li>
                </ul>
                <p className="mb-2">
                    <strong>Finalidade:</strong> participação nos comentários do blog e, opcionalmente, recebimento de newsletter.
                </p>
                <p className="mb-2">
                    <strong>Retenção:</strong> os dados são mantidos enquanto a conta estiver ativa. O usuário pode solicitar a exclusão a qualquer momento pela página <a href="/conta" className="text-blue-600 hover:underline">Minha Conta</a> ou por e-mail para <a href="mailto:joao@psicologojoaofernandes.com" className="text-blue-600 hover:underline">joao@psicologojoaofernandes.com</a>.
                </p>
                <p className="mb-4">
                    <strong>Direitos LGPD (Art. 18):</strong> o usuário pode a qualquer momento acessar, exportar (portabilidade) e excluir seus dados diretamente pela página <a href="/conta" className="text-blue-600 hover:underline">Minha Conta</a>. Ao solicitar exclusão, os comentários são anonimizados (substituídos por &ldquo;[comentário removido]&rdquo;) para manter a integridade dos artigos.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Newsletter do Blog</h2>
                <p className="mb-4">
                    Este site oferece a possibilidade de inscrição voluntária na <strong>newsletter do blog</strong>.
                    Ao se inscrever, o visitante fornece seu <strong>endereço de e-mail</strong> exclusivamente para receber notificações de novos artigos publicados.
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>O e-mail é coletado mediante <strong>consentimento explícito</strong> e registrado com a data e hora do consentimento.</li>
                    <li>Os dados são utilizados apenas para envio de notificações de novos artigos — sem fins comerciais ou de marketing.</li>
                    <li>O e-mail <strong>não é compartilhado com terceiros</strong>.</li>
                    <li>O cancelamento da inscrição pode ser feito a qualquer momento pelo link <em>Cancelar inscrição</em> presente em todos os e-mails recebidos ou pela página <a href="/conta" className="text-blue-600 hover:underline">Minha Conta</a>.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Cookies e Ferramentas de Análise</h2>
                <p className="mb-4">
                    Este site utiliza cookies e ferramentas de análise para compreender o uso do site e melhorar a experiência dos visitantes.
                    Nenhuma dessas ferramentas permite identificar visitantes individualmente.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Google Analytics 4 (GA4)</h3>
                <p className="mb-4">
                    Utilizamos o <strong>Google Analytics 4</strong> para coletar informações anônimas e estatísticas sobre o uso do site, como tempo de permanência nas páginas, origem do tráfego, profundidade de leitura dos artigos e cliques em botões.
                    Esses dados são transmitidos e armazenados pelo Google e utilizados exclusivamente para fins analíticos.
                    Para saber mais, consulte a <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Política de Privacidade do Google</a>.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">PostHog</h3>
                <p className="mb-4">
                    Utilizamos o <strong>PostHog</strong> para análise de eventos e monitoramento de erros técnicos no site.
                    Os dados coletados são anônimos e utilizados exclusivamente para fins de melhoria técnica e de conteúdo.
                    O PostHog é configurado com um proxy reverso hospedado neste próprio domínio — os dados não são enviados diretamente a servidores externos sem antes passar pela nossa infraestrutura.
                    Para saber mais, consulte a <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Política de Privacidade do PostHog</a>.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Cookie de GCLID (Google Ads)</h3>
                <p className="mb-4">
                    Quando você chega ao site a partir de um anúncio do Google Ads, o identificador de clique (GCLID) é armazenado em um cookie por 30 dias.
                    Esse cookie é pseudônimo e não está vinculado a dados pessoais identificáveis.
                    Você pode desativar esse rastreamento nas <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">configurações de anúncios do Google</a>.
                </p>

                <h3 className="text-xl font-semibold mt-6 mb-3">Cookie de Autenticação</h3>
                <p className="mb-4">
                    Usuários cadastrados no blog recebem um cookie HTTP-only de autenticação (<code>payload-token</code>) após o login.
                    Esse cookie é estritamente necessário para manter a sessão ativa e é excluído automaticamente ao efetuar logout ou ao excluir a conta.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">6. Dados do Profissional Responsável</h2>
                <p className="mb-4">
                    <strong>João Vitor Fernandes Domingues</strong><br />
                    Psicólogo Clínico — CRP 06/157908<br />
                    Atendimento pautado no Código de Ética Profissional do Psicólogo.<br />
                    E-mail: <a href="mailto:joao@psicologojoaofernandes.com" className="text-blue-600 hover:underline">joao@psicologojoaofernandes.com</a><br />
                    Telefone: <a href="tel:+5511955591996" className="text-blue-600 hover:underline">(11) 95559-1996</a><br />
                    Currículo Lattes:{" "}
                    <a href="https://lattes.cnpq.br/2507330776380191" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Acessar Currículo</a>
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">7. Responsável Técnico pelo Sistema</h2>
                <p className="mb-4">
                    O desenvolvimento e a manutenção técnica deste site são de responsabilidade de{" "}
                    <Link href="https://github.com/Xnths" className="text-blue-600 hover:underline">Jonathas Castilho</Link>,
                    desenvolvedor de software, sócio da <Link href="https://blog.xnths.com" className="text-blue-600 hover:underline">J. Tecnologia LTDA.</Link> (CNPJ 55.397.211/0001-00).
                    Contato: <a href="mailto:jonathas@xnths.com" className="text-blue-600 hover:underline">jonathas@xnths.com</a>.
                </p>
                <p className="mb-4">
                    O responsável técnico <strong>não possui acesso</strong> a dados pessoais de pacientes ou de visitantes que entrem em contato pelo WhatsApp. As ferramentas de analytics utilizadas processam apenas dados anônimos e agregados.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">8. Seus Direitos</h2>
                <p className="mb-4">
                    Nos termos da LGPD (Art. 18), você tem direito a: confirmar a existência do tratamento de seus dados; acessar os dados coletados; solicitar sua correção, portabilidade ou exclusão; revogar o consentimento a qualquer momento.
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li>Usuários cadastrados no blog podem exercer todos esses direitos diretamente pela página <a href="/conta" className="text-blue-600 hover:underline">Minha Conta</a>.</li>
                    <li>Para demais solicitações, entre em contato pelo e-mail listado na seção 6.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">9. Consentimento</h2>
                <p className="mb-4">
                    Ao utilizar este site, você concorda com esta Política de Privacidade. Ao se cadastrar no blog ou assinar a newsletter, você consente expressamente com o tratamento dos dados descritos nas seções 3 e 4.
                </p>

                <p className="mt-8 text-sm text-slate-500">
                    Esta política é efetiva a partir de {new Date().getFullYear()}. Última atualização: março de 2026.
                </p>
            </div>
        </main>
    );
}
