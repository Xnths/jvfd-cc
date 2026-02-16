
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
                    A sua privacidade é importante para nós. O site do <Link href="/" className="text-blue-600 hover:underline">Psicólogo João Fernandes</Link> <strong>não coleta dados pessoais identificáveis</strong> (como nome, e-mail ou telefone) de seus visitantes.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">1. Coleta de Dados</h2>
                <p className="mb-4">
                    Nós <strong>não utilizamos formulários de cadastro</strong> ou inscrição neste site. O único ponto de interação direta é o botão de WhatsApp, que redireciona o usuário para o aplicativo de mensagens para contato direto. Não armazenamos nenhuma informação pessoal sobre essa interação em nossos servidores.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">2. Uso de Cookies e Estatísticas</h2>
                <p className="mb-4">
                    Utilizamos o <strong>Google Analytics</strong> para coletar informações anônimas e estatísticas sobre o uso do site, como o tempo de permanência nas páginas, a origem do tráfego e cliques em botões (como o do WhatsApp).
                </p>
                <p className="mb-4">
                    Esses dados são utilizados exclusivamente para fins analíticos, permitindo-nos entender melhor como os visitantes interagem com o nosso site e melhorar a experiência do usuário.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">3. Contato</h2>
                <p className="mb-4">
                    Caso tenha dúvidas sobre nossa política de privacidade, entre em contato com o administrador do site ou o próprio profissional
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">4. Dados do Profissional</h2>
                <p className="mb-4">
                    <strong>João Vitor Fernandes</strong><br />
                    Atendimento pautado no Código de Ética Profissional do Psicólogo.<br />
                    E-mail: <a href="mailto:jvfd2014@hotmail.com" className="text-blue-600 hover:underline">jvfd2014@hotmail.com</a> / <a href="mailto:fernandesdominguesjoaovitor@gmail.com" className="text-blue-600 hover:underline">fernandesdominguesjoaovitor@gmail.com</a><br />
                    Telefone: <a href="tel:+5511955591996" className="text-blue-600 hover:underline">(11) 95559-1996</a><br />
                    CRP: 06/187056<br />
                    Currículo Lattes: <a href="https://lattes.cnpq.br/2507330776380191" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Acessar Currículo</a>
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">5. Administrador</h2>
                <p className="mb-4">
                    O administrador do site é <Link href="https://github.com/Xnths" className="text-blue-600 hover:underline">Jonathas Castilho</Link>, desenvolvedor de software e dono da empresa <Link href="https://blog.xnths.com" className="text-blue-600 hover:underline">J. Tecnologia LTDA.</Link> CNPJ 55397211000100.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">6. Consentimento</h2>
                <p className="mb-4">
                    Ao utilizar nosso site, você concorda com a nossa política de privacidade e com os termos de uso.
                </p>

                <p className="mt-8 text-sm text-slate-500">
                    Esta política é efetiva a partir de {new Date().getFullYear()}.
                </p>
            </div>
        </main>
    );
}
