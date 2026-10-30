
import Link from "next/link";
import { LegalBody } from "@/edit/LegalBody";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Política de Privacidade",
    description: "Política de Privacidade do site do Psicólogo João Fernandes. Saiba como seus dados são coletados e protegidos.",
    path: "/politica-de-privacidade",
    markdown: false,
});

export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-slate-900">Política de Privacidade</h1>

            <div className="prose prose-slate max-w-none text-slate-700">
                <LegalBody k="legal.privacidade">
                <p className="mb-4">
                    A sua privacidade é importante para nós. Esta política descreve como o site do{" "}
                    <Link href="/" className="text-blue-600 hover:underline">Psicólogo João Fernandes</Link>{" "}
                    coleta, usa e protege os seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Formas de Contato</h2>
                <p className="mb-4">
                    Este site oferece contato exclusivamente via <strong>WhatsApp</strong>, por meio de botão flutuante e QR code disponíveis na página inicial.
                    Ao clicar no botão ou escanear o QR code, você é redirecionado diretamente para o aplicativo WhatsApp.
                    Seu nome, e-mail e telefone não são coletados nem armazenados em nossos servidores por meio dessa interação.
                    Registramos apenas que houve um clique no botão: data e hora, a página e o botão clicados, o navegador utilizado e, se houver, os dados do anúncio descritos abaixo.
                </p>
                <p className="mb-4">
                    Se você chegar ao site por meio de um anúncio do Google Ads, os <strong>identificadores de clique do Google (GCLID, GBRAID ou WBRAID)</strong> e os parâmetros de campanha (UTM) presentes na URL são capturados e armazenados em cookies no seu navegador por até 30 dias.
                    Caso você clique no botão do WhatsApp durante essa sessão, esses dados são enviados aos nossos servidores e ao Google Ads exclusivamente para fins de mensuração de conversão de anúncios.
                    Esses identificadores são pseudônimos — não são vinculados ao seu nome, e-mail ou telefone, e não enviamos ao Google o seu telefone nem o conteúdo da conversa.
                    Os dados são mantidos por até 90 dias e utilizados apenas para relatórios de conversão junto ao Google Ads.
                    Você pode desativar o rastreamento de anúncios personalizados nas{" "}
                    <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">configurações de anúncios do Google</a>.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. Base Legal (LGPD — Lei 13.709/2018)</h2>
                <p className="mb-4">
                    Os tratamentos de dados pessoais realizados por este site estão fundamentados nas seguintes bases legais:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Consentimento (Art. 7º, I):</strong> inscrição na newsletter e envio de comentários no blog.</li>
                    <li><strong>Legítimo interesse (Art. 7º, IX):</strong> análises de uso do site por meio de ferramentas de analytics (GA4 e PostHog), utilizadas exclusivamente para melhoria do conteúdo e da experiência.</li>
                    <li><strong>Legítimo interesse (Art. 7º, IX), segurança:</strong> verificação anti-robô (Cloudflare Turnstile) e registro de uma versão codificada (hash) do endereço IP nos comentários, apenas para conter abuso.</li>
                </ul>
                <p className="mb-4">
                    O visitante pode retirar seu consentimento a qualquer momento, conforme descrito nas seções correspondentes abaixo.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Comentários do Blog</h2>
                <p className="mb-4">
                    Os artigos do blog aceitam comentários sem necessidade de cadastro ou senha. Ao enviar um comentário, são coletados:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Nome (ou apelido):</strong> exibido publicamente junto ao comentário, se ele for aprovado.</li>
                    <li><strong>Texto do comentário:</strong> exibido publicamente se aprovado. Não compartilhe informações pessoais ou de saúde.</li>
                    <li><strong>Hash do endereço IP:</strong> versão codificada e irreversível, usada apenas para detectar abuso. O endereço IP em si não é armazenado.</li>
                </ul>
                <p className="mb-2">
                    <strong>Finalidade:</strong> permitir a discussão dos artigos. Todos os comentários passam por moderação antes de serem publicados.
                </p>
                <p className="mb-4">
                    <strong>Retenção e exclusão:</strong> comentários aprovados permanecem publicados até que você peça a remoção. Comentários rejeitados são apagados periodicamente. Para solicitar a remoção de um comentário, escreva para{" "}
                    <a href="mailto:joao@psicologojoaofernandes.com" className="text-blue-600 hover:underline">joao@psicologojoaofernandes.com</a>.
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
                    <li>O cancelamento da inscrição pode ser feito a qualquer momento pelo link <em>Cancelar inscrição</em> presente em todos os e-mails recebidos, ou pedindo a exclusão por e-mail.</li>
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

                <h3 className="text-xl font-semibold mt-6 mb-3">Cookies de acesso administrativo</h3>
                <p className="mb-4">
                    Visitantes não precisam entrar em nenhuma conta e não recebem cookie de autenticação. Apenas as duas pessoas autorizadas a administrar o site entram, exclusivamente com a conta Google, e só elas recebem cookies de sessão (estritamente necessários).
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
                    <li>Para exercer esses direitos, entre em contato pelo e-mail listado na seção 6.</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">9. Consentimento</h2>
                <p className="mb-4">
                    Ao utilizar este site, você concorda com esta Política de Privacidade. Ao se cadastrar no blog ou assinar a newsletter, você consente expressamente com o tratamento dos dados descritos nas seções 3 e 4.
                </p>

                <p className="mt-8 text-sm text-slate-500">
                    Esta política é efetiva a partir de {new Date().getFullYear()}. Última atualização: março de 2026.
                </p>
                </LegalBody>
            </div>
        </div>
    );
}
