// Copy for /avaliacao-neuropsicologica (Google Ads landing page). Every text is wrapped in <SE>, so João can
// edit it in place; these are the defaults. No prices and no parcelamento anywhere (see CLAUDE.md).

export const AVALIACAO_SLUG = "avaliacao-neuropsicologica";

export const avaliacao = {
    hero: {
        badge: "Avaliação Neuropsicológica",
        title: "Avaliação neuropsicológica",
        subtitle:
            "Entenda como você ou seu filho prestam atenção, lembram, se organizam e se comunicam, com testes padronizados, laudo escrito e uma sessão de devolutiva.",
        cta: "Agendar avaliação pelo WhatsApp",
        note: "Consulta particular, com pedido médico. Emito recibo para reembolso.",
    },
    strip: ["Pós-graduação em Neuropsicologia · Hospital Israelita Albert Einstein", "CRP 06/157908", "Adultos e crianças", "Presencial na Vila Madalena"],
    when: {
        eyebrow: "Quando procurar",
        title: "Para que serve uma avaliação neuropsicológica",
        intro: "A avaliação reúne dados objetivos sobre o funcionamento cognitivo. Ela pode ajudar a esclarecer uma queixa, apoiar o trabalho do médico e de outros profissionais e orientar o cuidado, escolar, profissional e familiar.",
        groups: [
            {
                title: "Desenvolvimento e aprendizagem",
                text: "Contribui para a investigação diagnóstica e mostra pontos fortes e dificuldades de cada pessoa.",
                items: ["TDAH", "Autismo (TEA)", "Dificuldades de leitura, escrita e matemática", "Queixas escolares e de desempenho"],
            },
            {
                title: "Saúde mental",
                text: "Ajuda a entender o impacto cognitivo do quadro no dia a dia e a planejar o cuidado.",
                items: ["Depressão", "Transtorno bipolar", "Transtornos de personalidade, como o borderline", "Esquizofrenia e outros quadros psiquiátricos"],
            },
            {
                title: "Neurologia e envelhecimento",
                text: "Documenta o funcionamento cognitivo e permite acompanhar mudanças ao longo do tempo.",
                items: ["Queixas de memória", "Comprometimento cognitivo leve e demências", "Traumatismo craniano e AVC", "Epilepsia e esclerose múltipla"],
            },
        ],
    },
    research: {
        eyebrow: "O que a pesquisa mostra",
        title: "Uma ferramenta com respaldo científico",
        findings: [
            {
                text: "Revisão crítica de 56 estudos concluiu que a avaliação neuropsicológica melhora a classificação diagnóstica e a previsão de desfechos na vida diária, com evidência forte em comprometimento cognitivo leve, demência e traumatismo craniano.",
                ref: 1,
            },
            {
                text: "Uma revisão sistemática de 81 estudos com adultos encontrou evidência geralmente favorável para a acurácia diagnóstica e para o benefício percebido por médicos e pacientes.",
                ref: 2,
            },
            {
                text: "Em quadros psiquiátricos, alterações de atenção e funções executivas podem persistir mesmo quando o humor melhora (depressão) e atravessar diferentes fases da doença (transtorno bipolar). Mapeá-las ajuda a planejar o tratamento.",
                ref: 3,
            },
            {
                text: "A revisão da literatura recomenda que o resultado seja explicado em uma sessão de devolutiva, de preferência com material escrito, o que ajuda a lembrar e a seguir as orientações.",
                ref: 4,
            },
        ],
        caveat:
            "A avaliação não decide um diagnóstico sozinha: o diagnóstico é clínico e usa várias fontes de informação. Os próprios pesquisadores apontam que ainda faltam ensaios controlados sobre o efeito no tratamento.",
    },
    steps: {
        eyebrow: "Como funciona",
        title: "Do primeiro contato à devolutiva",
        items: [
            { title: "Pedido médico", text: "O processo parte de um pedido médico. Em caso de dúvida, você pode perguntar pelo WhatsApp." },
            { title: "Entrevista", text: "Conversa sobre a história de vida, a queixa e o contexto escolar, profissional e familiar." },
            { title: "Testes padronizados", text: "Instrumentos reconhecidos, com parecer favorável no SATEPSI, escolhidos conforme a demanda de cada caso." },
            { title: "Laudo", text: "Documento escrito com os procedimentos, os resultados e as conclusões, conforme a Resolução CFP 06/2019." },
            { title: "Devolutiva", text: "Encontro para apresentar e conversar sobre os resultados e os próximos passos." },
        ],
    },
    about: {
        eyebrow: "Quem conduz",
        title: "João Vitor Fernandes",
        text: "Psicólogo clínico, CRP 06/157908, com pós-graduação em Neuropsicologia pelo Hospital Israelita Albert Einstein. A avaliação é presencial, no consultório na Vila Madalena (Rua Harmonia, 1323, Sumarezinho, São Paulo), de segunda a sexta, das 8h às 21h.",
    },
    faqTitle: "Perguntas frequentes",
    faq: [
        {
            question: "Aceita convênio médico?",
            answer: "Não. João não atende por convênio médico: a avaliação neuropsicológica é uma consulta particular. Ele emite recibo para você solicitar o reembolso ao seu plano de saúde.",
        },
        {
            question: "Como funciona o reembolso?",
            answer: "Você faz a consulta particular, recebe o recibo e pede o reembolso diretamente ao seu plano. A cobertura e os documentos exigidos dependem do seu contrato, por isso vale confirmar com a operadora antes de começar.",
        },
        {
            question: "Preciso de pedido médico?",
            answer: "Sim. A avaliação é agendada com pedido médico. Se ainda não tiver o seu, tire suas dúvidas pelo WhatsApp antes de conversar com seu médico.",
        },
        {
            question: "A avaliação dá um diagnóstico?",
            answer: "Os testes não fecham um diagnóstico sozinhos. Os resultados são analisados junto com a entrevista e a história de vida, e o laudo pode apoiar o trabalho do médico e de outros profissionais que acompanham você.",
        },
        {
            question: "O que eu recebo ao final?",
            answer: "Um laudo escrito e uma sessão de devolutiva para conversar sobre os resultados.",
        },
        {
            question: "Quanto tempo leva?",
            answer: "A quantidade de encontros e a duração de cada etapa variam conforme o caso. João passa essas informações pelo WhatsApp.",
        },
        {
            question: "Atende crianças?",
            answer: "Sim, a avaliação é feita com adultos e crianças.",
        },
        {
            question: "A avaliação é online?",
            answer: "Não. A avaliação neuropsicológica é realizada somente de forma presencial, no consultório na Vila Madalena.",
        },
        {
            question: "Quais são os valores?",
            answer: "Os valores são informados diretamente por João, pelo WhatsApp.",
        },
        {
            question: "Como agendo?",
            answer: "Pelo WhatsApp, de segunda a sexta, das 8h às 21h.",
        },
    ],
    closing: {
        eyebrow: "Próximo passo",
        title: "Tem um pedido médico e dúvidas sobre o processo?",
        cta: "Agendar avaliação pelo WhatsApp",
    },
    referencesTitle: "Referências",
    references: [
        { n: 1, text: "Donders J. The incremental value of neuropsychological assessment: a critical review. Clin Neuropsychol. 2020;34(1):56-87.", doi: "10.1080/13854046.2019.1575471" },
        { n: 2, text: "Watt S, Crowe SF. Examining the beneficial effect of neuropsychological assessment on adult patient outcomes: a systematic review. Clin Neuropsychol. 2018;32(3):368-390.", doi: "10.1080/13854046.2017.1414885" },
        { n: 3, text: "Rock PL et al. Cognitive impairment in depression: a systematic review and meta-analysis. Psychol Med. 2014;44(10):2029-40; Nicoloro-SantaBarbara J et al. Cognition in bipolar disorder: an update for clinicians. Focus. 2023;21(4):363-369.", doi: "10.1017/S0033291713002535" },
        { n: 4, text: "Gruters AAA et al. A scoping review of communicating neuropsychological test results to patients and family members. Neuropsychol Rev. 2022;32(2):294-315.", doi: "10.1007/s11065-021-09507-2" },
    ],
};
