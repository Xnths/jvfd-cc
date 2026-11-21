// Condition pages under /avaliacao-neuropsicologica/<slug> and the "Para quem é" cards on the main page.
// Every text is the default of an <Editable k="avaliacao.<slug>.<field>"> (or "avaliacao.sub.<field>" for the parts the
// pages share), so João can edit it in place. List keys are index based (sign_<i>, faq_<i>_q…): add new items at the
// end, never in the middle, or saved edits land on the wrong item.
//
// Rules (CFP Res. 010/2005, Res. 06/2019, Res. 31/2022): no prices, no promised results, the evaluation "contribui
// para" a diagnosis made with the medical team, only real titles, never name a psychological test (only "testes
// padronizados com parecer favorável no SATEPSI"), no testimonials, no fear-based copy. João is never called
// "neuropsicólogo" or "especialista". Every claim must be supported by a reference cited on the same page.

export type Audience = "Crianças" | "Adolescentes" | "Adultos" | "Idosos";

export type ConditionReference = { text: string; doi?: string };

export type Condition = {
    slug: string;
    /** Index of the group in serviceLandings["avaliacao-neuropsicologica"].when.groups (0 desenvolvimento, 1 saúde mental, 2 neurologia). */
    group: 0 | 1 | 2;
    tags: Audience[];
    card: { title: string; description: string };
    /** Completes the H1: "Avaliação neuropsicológica para {h1}". */
    h1: string;
    /** Name of the condition for JSON-LD (MedicalCondition). */
    conditionName: string;
    metaTitle: string;
    metaDescription: string;
    lead: string;
    whatIs: string[];
    whatIsRefs: number[];
    /** Optional link after "O que é" (e.g. to the studies on the main page). */
    whatIsLink?: { href: string; text: string };
    signs: string[];
    investigatesIntro?: string;
    investigates: { fn: string; text: string }[];
    investigatesRefs?: number[];
    helps: string[];
    helpsRefs: number[];
    /** One neutral line, shown once, after "Como a avaliação ajuda". */
    crisisLine?: string;
    faq: { question: string; answer: string }[];
    references: ConditionReference[];
};

export const AVALIACAO_PATH = "/avaliacao-neuropsicologica";

/** Same text and analytics key as the service row (migration 0010). The live values come from Postgres; these are the fallback. */
export const AVALIACAO_WHATSAPP_MESSAGE = "Olá, gostaria de informações sobre a avaliação neuropsicológica.";
export const AVALIACAO_ANALYTICS_KEY = "service_page_avaliacao-neuropsicologica";

const DSM5TR: ConditionReference = {
    text: "American Psychiatric Association. Diagnostic and Statistical Manual of Mental Disorders, Fifth Edition, Text Revision (DSM-5-TR). Washington, DC: APA; 2022.",
    doi: "10.1176/appi.books.9780890425787",
};
const DONDERS: ConditionReference = {
    text: "Donders J. The incremental value of neuropsychological assessment: a critical review. Clin Neuropsychol. 2020;34(1):56-87.",
    doi: "10.1080/13854046.2019.1575471",
};

/** Final card of the grid: opens WhatsApp with the page's own tracked CTA. */
export const OTHER_CARD = {
    title: "Outras queixas",
    description: "Não encontrou sua situação? Envie o pedido médico e conversamos.",
    link: "Falar pelo WhatsApp →",
};

/** Copy shared by every condition page (keys avaliacao.sub.*). */
export const SUBPAGE = {
    breadcrumbHome: "Início",
    breadcrumbParent: "Avaliação neuropsicológica",
    h1Prefix: "Avaliação neuropsicológica para",
    cta: "Agendar avaliação com pedido médico",
    note: "Consulta particular, sem convênio; João emite recibo para reembolso. Somente presencial, na Vila Madalena. Para crianças e adolescentes, o agendamento é feito por um responsável. Valores informados pelo WhatsApp.",
    whatIsTitle: "O que é",
    signsTitle: "Sinais que costumam motivar o pedido",
    signsNote: "Esses sinais não fecham um diagnóstico: eles ajudam a decidir, com o médico, se vale investigar.",
    investigatesTitle: "O que a avaliação investiga",
    investigatesNote: "Os instrumentos são testes padronizados com parecer favorável no SATEPSI, escolhidos para cada caso.",
    helpsTitle: "Como a avaliação ajuda",
    stepsTitle: "Como funciona",
    stepsLink: "Veja o processo completo",
    faqTitle: "Perguntas frequentes",
    refsTitle: "Referências",
    closingTitle: "Tem um pedido médico? Agende pelo WhatsApp.",
    closingNote: "Pedido médico necessário · particular, sem convênio · recibo para reembolso · presencial · em geral, 4 a 6 sessões de até 2 horas.",
    backLink: "← Voltar para a avaliação neuropsicológica",
    otherConditions: "Outros quadros avaliados",
    steps: [
        { title: "Pedido médico", text: "Você envia o pedido médico pelo WhatsApp e agenda a primeira sessão." },
        { title: "Entrevista", text: "Você, ou o responsável, conta a história, a queixa e como é a rotina." },
        { title: "Testes padronizados", text: "Você faz tarefas com testes padronizados, em sessões de até 2 horas." },
        { title: "Laudo", text: "Você recebe um laudo escrito, conforme a Resolução CFP 06/2019." },
        { title: "Devolutiva", text: "Você conversa sobre os resultados e recebe orientações por escrito." },
    ],
};

export const conditions: Condition[] = [
    {
        slug: "tdah",
        group: 0,
        tags: ["Crianças", "Adolescentes", "Adultos"],
        card: { title: "TDAH", description: "Desatenção, impulsividade ou agitação que atrapalham a escola, o trabalho ou a rotina." },
        h1: "TDAH",
        conditionName: "Transtorno de déficit de atenção e hiperatividade (TDAH)",
        metaTitle: "Avaliação neuropsicológica para TDAH | Vila Madalena, SP",
        metaDescription: "Avaliação neuropsicológica para TDAH em crianças, adolescentes e adultos, presencial na Vila Madalena (SP). Testes padronizados, laudo e devolutiva.",
        lead: "Para crianças, adolescentes e adultos com queixas de atenção, impulsividade ou agitação que pesam na rotina.",
        whatIs: [
            "O TDAH é o transtorno de déficit de atenção e hiperatividade. Ele está descrito no DSM-5-TR. A pessoa mostra um padrão de desatenção, de agitação e impulsividade, ou dos dois. Esse padrão começa na infância e se mantém com o tempo.",
            "Para pensar em TDAH, os sinais precisam aparecer em mais de um lugar, como em casa, na escola ou no trabalho. Eles também precisam trazer prejuízo real. Uma distração de vez em quando não basta: o que conta é um jeito de agir que se repete há anos.",
        ],
        whatIsRefs: [1, 2],
        signs: [
            "Perde o fio da tarefa no meio e passa para outra coisa.",
            "Esquece compromissos, prazos e objetos, como chaves, celular ou material escolar.",
            "Responde antes de a pergunta terminar, na aula ou em reuniões.",
            "Tem dificuldade para esperar a vez em filas, jogos ou conversas.",
            "Começa muitos projetos e termina poucos.",
            "Adia tarefas longas, como trabalhos escolares, relatórios ou contas, até a última hora.",
            "Em adultos, a família lembra de queixas da escola desde cedo, como recados sobre distração ou conversa em sala.",
        ],
        investigatesIntro: "Dificuldades de atenção e de funções executivas são frequentes no TDAH, mas não aparecem em todas as pessoas com o quadro. Por isso a avaliação descreve o perfil de cada um.",
        investigates: [
            { fn: "Atenção sustentada", text: "Por quanto tempo a pessoa mantém o foco em uma tarefa longa e repetitiva." },
            { fn: "Atenção seletiva", text: "Se consegue se concentrar no que importa e ignorar o que distrai." },
            { fn: "Atenção alternada", text: "Como muda o foco de uma tarefa para outra e volta sem perder o que fazia." },
            { fn: "Controle inibitório", text: "Se consegue segurar uma resposta automática e esperar o momento de agir." },
            { fn: "Memória operacional", text: "Quanta informação mantém em mente enquanto faz outra coisa, como guardar um número e fazer uma conta." },
            { fn: "Planejamento e organização", text: "Como divide uma tarefa em etapas, escolhe a ordem e confere o resultado." },
            { fn: "Velocidade de processamento", text: "Quanto tempo leva para fazer tarefas simples com precisão." },
        ],
        investigatesRefs: [3],
        helps: [
            "Ajuda a diferenciar o TDAH de quadros com sinais parecidos, como ansiedade, depressão, problemas de sono e transtornos de aprendizagem. Esses quadros também podem aparecer junto com o TDAH.",
            "Mostra pontos fortes e dificuldades, o que orienta o planejamento do tratamento e as orientações para a escola ou o trabalho.",
            "Cria uma linha de base para comparar em reavaliações, quando o médico pedir.",
            "O diagnóstico é feito pelo médico, com a equipe que acompanha o caso. O laudo é uma das fontes de informação dessa decisão.",
        ],
        helpsRefs: [2],
        faq: [
            {
                question: "Adulto pode ser avaliado para TDAH?",
                answer: "Sim. Muitos adultos procuram a avaliação depois de anos de dificuldade com prazos, organização ou estudo. A entrevista inclui a história escolar, e pode ajudar que um familiar conte como você era na infância.",
            },
            {
                question: "A avaliação substitui a consulta com o psiquiatra?",
                answer: "Não. A avaliação reúne dados sobre atenção e funções executivas e entrega um laudo para o médico. O diagnóstico e as decisões sobre o tratamento ficam com o psiquiatra ou o neurologista.",
            },
            {
                question: "Preciso parar a medicação para fazer a avaliação?",
                answer: "Não pare nem mude a medicação por conta própria: essa decisão é sempre do médico que prescreveu. Conte na entrevista quais remédios você usa e em que horários, para que isso seja levado em conta na análise.",
            },
        ],
        references: [
            DSM5TR,
            {
                text: "Faraone SV et al. The World Federation of ADHD International Consensus Statement: 208 evidence-based conclusions about the disorder. Neurosci Biobehav Rev. 2021;128:789-818.",
                doi: "10.1016/j.neubiorev.2021.01.022",
            },
            {
                text: "Willcutt EG et al. Validity of the executive function theory of attention-deficit/hyperactivity disorder: a meta-analytic review. Biol Psychiatry. 2005;57(11):1336-46.",
                doi: "10.1016/j.biopsych.2005.02.006",
            },
        ],
    },
    {
        slug: "autismo-tea",
        group: 0,
        tags: ["Crianças", "Adolescentes", "Adultos"],
        card: { title: "Autismo (TEA)", description: "Diferenças na comunicação social e padrões repetitivos ou interesses restritos, em qualquer idade." },
        h1: "autismo (TEA)",
        conditionName: "Transtorno do espectro autista (TEA)",
        metaTitle: "Avaliação neuropsicológica para autismo (TEA) | SP",
        metaDescription: "Avaliação neuropsicológica para autismo (TEA) em crianças, adolescentes e adultos, presencial na Vila Madalena (SP), como parte do diagnóstico em equipe.",
        lead: "Para crianças, adolescentes e adultos, como parte de uma investigação feita com o médico e outros profissionais.",
        whatIs: [
            "O transtorno do espectro autista (TEA) está descrito no DSM-5-TR. Ele aparece de duas formas no dia a dia. A primeira são diferenças na comunicação e na interação com outras pessoas. A segunda são comportamentos, interesses ou atividades repetitivos ou restritos.",
            "Os sinais começam cedo, mas às vezes só ficam claros quando a vida social pede mais, na escola ou no trabalho. O DSM-5-TR descreve três níveis de suporte, conforme a ajuda de que a pessoa precisa. Aqui usamos \"pessoa autista\" ou \"pessoa com TEA\".",
        ],
        whatIsRefs: [1, 2],
        signs: [
            "Tem dificuldade para começar uma conversa ou mantê-la quando o assunto não é do seu interesse.",
            "Entende frases ao pé da letra e estranha ironias ou expressões de duplo sentido.",
            "Prefere rotinas fixas e fica muito incomodado quando o plano muda de última hora.",
            "Tem interesses intensos e focados, sobre os quais fala ou estuda por horas.",
            "Reage muito, ou pouco, a sons, texturas, cheiros ou luzes, como tapar os ouvidos em lugares barulhentos.",
            "Em adultos, relata grande cansaço depois de eventos sociais e esforço para imitar o jeito dos outros, a chamada camuflagem.",
        ],
        investigatesIntro: "A avaliação olha para o perfil completo, não só para os sinais de autismo. No caso de crianças e adolescentes, os pais ou responsáveis participam das entrevistas.",
        investigates: [
            { fn: "Cognição social e teoria da mente", text: "Como a pessoa entende intenções, emoções e pontos de vista dos outros." },
            { fn: "Linguagem e uso social da linguagem", text: "Vocabulário, compreensão e o uso da fala em conversas, como esperar a vez e entender o contexto." },
            { fn: "Flexibilidade cognitiva", text: "Como lida com mudanças de regra e busca outra solução quando a primeira não dá certo." },
            { fn: "Funções executivas", text: "Planejamento, organização e controle do próprio comportamento em tarefas com várias etapas." },
            { fn: "Perfil intelectual geral", text: "Pontos fortes e dificuldades no raciocínio verbal e não verbal." },
            { fn: "Comportamento adaptativo", text: "Autonomia no dia a dia, como cuidado pessoal, comunicação e convivência, com informações de familiares." },
        ],
        investigatesRefs: [2, 3],
        helps: [
            "O diagnóstico de TEA é feito em equipe. O médico (neurologista ou psiquiatra) conduz o diagnóstico, com informações da avaliação neuropsicológica e, quando indicado, de fonoaudiólogo e terapeuta ocupacional.",
            "O laudo descreve pontos fortes e dificuldades, o que ajuda a definir apoios na escola, no trabalho e em casa.",
            "Ajuda a separar o TEA de quadros que podem aparecer junto com ele, como ansiedade e TDAH.",
            "Cria uma linha de base para acompanhar o desenvolvimento ao longo do tempo.",
        ],
        helpsRefs: [2, 3],
        faq: [
            {
                question: "Adultos podem receber diagnóstico de autismo?",
                answer: "Sim. Muitas pessoas, sobretudo as que aprenderam a camuflar os sinais, só procuram a investigação na vida adulta. A entrevista resgata a história desde a infância e, quando possível, conta com relatos de familiares.",
            },
            {
                question: "A avaliação define o nível de suporte?",
                answer: "O nível de suporte é definido pelo médico, no diagnóstico. A avaliação neuropsicológica traz dados sobre autonomia, comunicação e funcionamento cognitivo que ajudam nessa definição.",
            },
            {
                question: "A escola participa?",
                answer: "Pode participar. Com a autorização da família, a escola pode responder a questionários sobre o comportamento da criança em sala. O laudo e o material escrito trazem orientações que a família pode levar à escola.",
            },
        ],
        references: [
            DSM5TR,
            {
                text: "Lord C et al. Autism spectrum disorder. Nat Rev Dis Primers. 2020;6(1):5.",
                doi: "10.1038/s41572-019-0138-4",
            },
            {
                text: "Lai MC, Lombardo MV, Baron-Cohen S. Autism. Lancet. 2014;383(9920):896-910.",
                doi: "10.1016/S0140-6736(13)61539-1",
            },
            {
                text: "Hull L et al. \"Putting on my best normal\": social camouflaging in adults with autism spectrum conditions. J Autism Dev Disord. 2017;47(8):2519-2534.",
                doi: "10.1007/s10803-017-3166-5",
            },
        ],
    },
    {
        slug: "transtornos-de-aprendizagem",
        group: 0,
        tags: ["Crianças", "Adolescentes", "Adultos"],
        card: { title: "Dislexia, discalculia e dificuldades de aprendizagem", description: "Dificuldade persistente em leitura, escrita ou matemática, apesar de ensino adequado." },
        h1: "dificuldades de aprendizagem",
        conditionName: "Transtorno específico da aprendizagem",
        metaTitle: "Avaliação neuropsicológica para dislexia e discalculia",
        metaDescription: "Avaliação neuropsicológica para dislexia, discalculia e disortografia, presencial na Vila Madalena (SP). Laudo com orientações para a escola e devolutiva.",
        lead: "Para crianças, adolescentes e adultos com dificuldade persistente em leitura, escrita ou matemática.",
        whatIs: [
            "O DSM-5-TR chama esse quadro de transtorno específico da aprendizagem. A pessoa tem dificuldade para ler, escrever ou fazer contas, abaixo do que se espera para a idade. A dificuldade dura pelo menos seis meses, mesmo com ajuda dirigida.",
            "Os nomes mais conhecidos são dislexia (leitura), disortografia (escrita) e discalculia (matemática). Para falar em transtorno, a dificuldade não pode ser explicada por deficiência intelectual, por problemas de visão ou audição, ou por falta de acesso ao ensino.",
        ],
        whatIsRefs: [1],
        signs: [
            "Lê devagar e com esforço, mesmo textos curtos.",
            "Troca ou omite letras ao ler ou escrever, como b e d, ou f e v.",
            "Lê o texto, mas não consegue contar o que entendeu.",
            "Repete os mesmos erros de ortografia, mesmo depois de corrigidos.",
            "Tem dificuldade para entender quantidades, contar e fazer contas simples.",
            "Evita ler em voz alta na sala de aula.",
            "As queixas da escola continuam mesmo depois de aulas de reforço.",
        ],
        investigatesIntro: "A avaliação procura entender onde a dificuldade começa e descartar outras explicações.",
        investigates: [
            { fn: "Processamento fonológico", text: "Se a pessoa percebe e manipula os sons da fala, como separar sílabas e trocar sons de lugar." },
            { fn: "Leitura e escrita", text: "Velocidade, precisão e compreensão da leitura, e o tipo de erro que aparece na escrita." },
            { fn: "Raciocínio matemático", text: "Senso de quantidade, cálculo e resolução de problemas." },
            { fn: "Memória operacional", text: "Quanta informação guarda enquanto faz outra tarefa, como lembrar o começo da frase enquanto lê o fim." },
            { fn: "Atenção", text: "Se a dificuldade está na leitura em si ou em manter o foco." },
            { fn: "Perfil intelectual", text: "O raciocínio geral, para descartar outras explicações para a dificuldade." },
        ],
        investigatesRefs: [2, 3],
        helps: [
            "Ajuda a diferenciar um transtorno de aprendizagem de outras causas, como TDAH, deficiência intelectual ou falta de oportunidade de ensino.",
            "O laudo traz recomendações para a escola, como adaptações em provas, tempo estendido e formas de apresentar o conteúdo, que a família pode levar à coordenação.",
            "Orienta o trabalho de fonoaudiólogo, psicopedagogo ou professor com a criança ou o adolescente.",
            "O diagnóstico é feito com a equipe que acompanha o caso, a partir de várias fontes de informação.",
        ],
        helpsRefs: [1],
        faq: [
            {
                question: "Com que idade dá para avaliar?",
                answer: "A partir da idade escolar, quando a leitura, a escrita e a matemática já estão sendo ensinadas. Adolescentes e adultos que nunca foram avaliados também podem fazer. O pedido médico orienta o momento.",
            },
            {
                question: "O laudo serve para pedir adaptações na escola ou no vestibular?",
                answer: "O laudo descreve as dificuldades e traz recomendações que a família pode apresentar à escola. Cada escola e cada vestibular tem regras e documentos próprios para conceder adaptações, por isso vale consultar a coordenação ou o edital.",
            },
            {
                question: "Qual a diferença para TDAH?",
                answer: "No TDAH, a dificuldade principal está na atenção e no controle do comportamento, em várias situações. No transtorno de aprendizagem, ela se concentra em habilidades específicas, como ler, escrever ou calcular. Os dois podem aparecer juntos, e a avaliação ajuda a separar o que é de cada um.",
            },
        ],
        references: [
            DSM5TR,
            {
                text: "Peterson RL, Pennington BF. Developmental dyslexia. Lancet. 2012;379(9830):1997-2007.",
                doi: "10.1016/S0140-6736(12)60198-6",
            },
            {
                text: "Butterworth B, Varma S, Laurillard D. Dyscalculia: from brain to education. Science. 2011;332(6033):1049-53.",
                doi: "10.1126/science.1201536",
            },
        ],
    },
    {
        slug: "memoria-e-demencias",
        group: 2,
        tags: ["Adultos", "Idosos"],
        card: { title: "Memória, comprometimento cognitivo leve e demências", description: "Esquecimentos que preocupam você ou sua família e mudanças na memória com a idade." },
        h1: "queixas de memória e demências",
        conditionName: "Comprometimento cognitivo leve e demência",
        metaTitle: "Avaliação neuropsicológica de memória e demências | SP",
        metaDescription: "Avaliação neuropsicológica para queixas de memória, comprometimento cognitivo leve e demências, presencial na Vila Madalena (SP), para adultos e idosos.",
        lead: "Para adultos e idosos com esquecimentos que preocupam a própria pessoa ou a família.",
        whatIs: [
            "Com a idade, é comum demorar mais para lembrar um nome ou aprender algo novo. Isso faz parte do envelhecimento e não tira a independência da pessoa.",
            "No comprometimento cognitivo leve (CCL), a queda é maior do que a esperada para a idade, mas a pessoa ainda cuida das próprias tarefas. Na demência, que o DSM-5-TR chama de transtorno neurocognitivo maior, a queda já tira a independência, como cuidar do dinheiro ou dos remédios. O que separa os três é a independência no dia a dia.",
        ],
        whatIsRefs: [1, 2],
        signs: [
            "Repete as mesmas perguntas ou histórias no mesmo dia.",
            "Esquece conversas recentes e combinados da semana.",
            "Se perde em caminhos que conhece bem.",
            "Passa a ter dificuldade para pagar contas, lidar com dinheiro ou tomar os remédios na hora certa.",
            "A família percebe que a memória ou a organização já não são como antes.",
        ],
        investigatesIntro: "Um familiar ou pessoa próxima é convidado a participar de parte da entrevista, porque percebe mudanças que a própria pessoa às vezes não nota.",
        investigates: [
            { fn: "Memória episódica", text: "Como a pessoa aprende uma informação nova, quanto guarda e quanto lembra depois de um tempo." },
            { fn: "Atenção", text: "Se a dificuldade de lembrar começa na hora de prestar atenção." },
            { fn: "Linguagem", text: "Nomear objetos e encontrar palavras com rapidez." },
            { fn: "Funções visuoespaciais", text: "Copiar desenhos, se orientar no espaço e montar figuras." },
            { fn: "Funções executivas", text: "Planejar, mudar de estratégia e resolver problemas." },
            { fn: "Atividades do dia a dia", text: "Autonomia para compras, contas e remédios, com informações do familiar." },
        ],
        helps: [
            "Ajuda a diferenciar envelhecimento normal, CCL e demência, com dados objetivos sobre cada função.",
            "Ajuda a distinguir queixas de memória ligadas à depressão daquelas ligadas a doenças neurodegenerativas.",
            "Cria uma linha de base para comparar em reavaliações e acompanhar mudanças ao longo do tempo.",
            "Orienta a família sobre apoios para a rotina. O diagnóstico é feito pelo médico, com os exames e as demais informações do caso.",
        ],
        helpsRefs: [2, 3],
        faq: [
            {
                question: "Esquecimento é normal com a idade?",
                answer: "Algum esquecimento é esperado, como demorar para lembrar um nome que depois vem à cabeça. O que merece atenção é a mudança em relação ao jeito de antes, sobretudo quando atrapalha tarefas do dia a dia. Nesses casos, vale conversar com o médico.",
            },
            {
                question: "Quanto tempo depois devo reavaliar?",
                answer: "O intervalo depende do quadro e é definido com o médico que acompanha o caso. A reavaliação compara os novos resultados com os da primeira avaliação para ver se houve mudança.",
            },
            {
                question: "Um familiar precisa acompanhar?",
                answer: "É recomendado. Um familiar ou pessoa próxima participa de parte da entrevista e conta como está a rotina. Os testes são feitos só com o paciente.",
            },
        ],
        references: [
            DSM5TR,
            {
                text: "Petersen RC. Mild cognitive impairment. Continuum (Minneap Minn). 2016;22(2):404-18.",
                doi: "10.1212/CON.0000000000000313",
            },
            DONDERS,
        ],
    },
    {
        slug: "saude-mental",
        group: 1,
        tags: ["Adolescentes", "Adultos"],
        card: { title: "Depressão, transtorno bipolar e outros quadros", description: "Quando a concentração, a memória ou a organização mudaram junto com o humor." },
        h1: "depressão, bipolaridade e outros quadros psiquiátricos",
        conditionName: "Alterações cognitivas em transtornos psiquiátricos",
        metaTitle: "Avaliação neuropsicológica em depressão e bipolaridade",
        metaDescription: "Avaliação neuropsicológica da atenção, da memória e das funções executivas em depressão, bipolaridade e outros quadros, presencial na Vila Madalena (SP).",
        lead: "Para adolescentes e adultos que notaram mudanças na concentração, na memória ou na organização junto com o humor.",
        whatIs: [
            "Depressão, transtorno bipolar, transtornos de personalidade e esquizofrenia não mudam só o humor ou o comportamento. Muitas vezes, mudam também a atenção, a memória e a forma de planejar.",
            "Essas mudanças podem ser medidas e costumam pesar no trabalho e nos estudos. Na depressão, parte delas pode continuar mesmo depois que o humor melhora. No transtorno bipolar, elas podem aparecer nas diferentes fases do quadro.",
        ],
        whatIsRefs: [1, 2, 3],
        whatIsLink: { href: "/avaliacao-neuropsicologica#respaldo-cientifico", text: "Veja os estudos na página da avaliação" },
        signs: [
            "Dificuldade de concentração no trabalho ou nos estudos depois de um episódio.",
            "Sensação de pensamento mais lento, como se tudo levasse mais tempo.",
            "Esquece tarefas e combinados que antes lembrava sem esforço.",
            "Dificuldade para tomar decisões, mesmo simples.",
            "Queda no desempenho que continua mesmo depois que o humor melhorou.",
        ],
        investigatesIntro: "A avaliação é planejada a partir da pergunta do médico que fez o pedido.",
        investigates: [
            { fn: "Atenção", text: "Por quanto tempo a pessoa mantém o foco e como lida com distrações." },
            { fn: "Velocidade de processamento", text: "Se o pensamento ficou mais lento em tarefas simples." },
            { fn: "Memória", text: "Como aprende e lembra informações novas." },
            { fn: "Funções executivas", text: "Planejar, organizar, tomar decisões e mudar de estratégia." },
            { fn: "Aspectos emocionais e de personalidade", text: "Quando o médico pede, a avaliação também descreve aspectos emocionais e de personalidade." },
        ],
        helps: [
            "Ajuda o psiquiatra e o psicoterapeuta a planejar o tratamento, com dados sobre o que mudou na atenção, na memória e na organização.",
            "Orienta a volta ao trabalho ou aos estudos, com sugestões de ajustes na rotina.",
            "Cria uma linha de base para acompanhar a evolução.",
            "Não substitui o acompanhamento psiquiátrico nem a psicoterapia. O diagnóstico é feito pelo médico, com a equipe que acompanha o caso.",
        ],
        helpsRefs: [3],
        crisisLine: "Se você está em crise, procure atendimento imediato: CVV 188 ou o pronto-socorro mais próximo.",
        faq: [
            {
                question: "A avaliação diagnostica depressão ou bipolaridade?",
                answer: "Não sozinha. O diagnóstico é feito pelo psiquiatra, a partir da entrevista clínica e da história. A avaliação descreve como está o funcionamento cognitivo e traz dados que ajudam no tratamento.",
            },
            {
                question: "Posso fazer durante uma crise?",
                answer: "De preferência, a avaliação é feita em uma fase estável, decidida junto com o médico. Durante uma crise, os resultados podem refletir o momento, e não o funcionamento de costume.",
            },
            {
                question: "O resultado vai para meu psiquiatra?",
                answer: "O laudo é entregue a você na devolutiva e é escrito para o médico que fez o pedido. Você leva o documento à próxima consulta.",
            },
        ],
        references: [
            {
                text: "Rock PL et al. Cognitive impairment in depression: a systematic review and meta-analysis. Psychol Med. 2014;44(10):2029-40.",
                doi: "10.1017/S0033291713002535",
            },
            {
                text: "Nicoloro-SantaBarbara J et al. Cognition in bipolar disorder: an update for clinicians. Focus. 2023;21(4):363-369.",
                doi: "10.1176/appi.focus.20230012",
            },
            {
                text: "Lam RW et al. Cognitive dysfunction in major depressive disorder: effects on psychosocial functioning and implications for treatment. Can J Psychiatry. 2014;59(12):649-54.",
                doi: "10.1177/070674371405901206",
            },
        ],
    },
    {
        slug: "condicoes-neurologicas",
        group: 2,
        tags: ["Adolescentes", "Adultos", "Idosos"],
        card: { title: "TCE, AVC, epilepsia e esclerose múltipla", description: "Mudanças cognitivas após traumatismo craniano, AVC, ou em epilepsia e esclerose múltipla." },
        h1: "condições neurológicas",
        conditionName: "Alterações cognitivas em condições neurológicas",
        metaTitle: "Avaliação neuropsicológica após AVC, TCE e em epilepsia",
        metaDescription: "Avaliação neuropsicológica após traumatismo craniano ou AVC e em epilepsia ou esclerose múltipla, presencial na Vila Madalena (SP), com laudo e devolutiva.",
        lead: "Para adolescentes, adultos e idosos com mudanças no pensamento depois de uma lesão no cérebro ou com uma doença neurológica.",
        whatIs: [
            "Um traumatismo craniano (TCE), um AVC, a epilepsia ou a esclerose múltipla podem mudar funções específicas do pensamento. A pessoa pode manter uma boa memória e passar a ter dificuldade de atenção, ou o contrário.",
            "Por isso, cada caso tem um perfil próprio. A avaliação mostra quais funções estão preservadas e quais foram afetadas. Ela também mostra como isso aparece na rotina, no trabalho e nos estudos.",
        ],
        whatIsRefs: [1],
        signs: [
            "Mudanças na memória ou na atenção depois de uma lesão ou de um diagnóstico.",
            "Pensamento mais lento do que antes.",
            "Dificuldade para encontrar palavras ou acompanhar conversas mais longas.",
            "Dificuldade para planejar o dia ou seguir uma sequência de passos.",
            "Mudanças de comportamento percebidas pela família, como irritação ou falta de iniciativa.",
            "Dificuldade para voltar ao trabalho ou aos estudos.",
        ],
        investigatesIntro: "Traga para a primeira sessão o pedido do neurologista e os laudos dos exames que você já tem.",
        investigates: [
            { fn: "Atenção", text: "Manter o foco, dividir a atenção entre duas tarefas e ignorar distrações." },
            { fn: "Memória", text: "Aprender, guardar e lembrar informações novas." },
            { fn: "Linguagem", text: "Nomear, encontrar palavras e compreender frases." },
            { fn: "Funções visuoespaciais", text: "Perceber, copiar e organizar informações no espaço." },
            { fn: "Funções executivas", text: "Planejar, começar e acompanhar tarefas, e mudar de estratégia." },
            { fn: "Velocidade de processamento", text: "Quanto tempo a pessoa leva para pensar e responder." },
        ],
        helps: [
            "Orienta o planejamento da reabilitação neuropsicológica, que trabalha as funções afetadas e usa as preservadas como apoio.",
            "Ajuda a decidir, com a equipe, o momento e a forma de voltar ao trabalho ou aos estudos.",
            "Cria uma linha de base para acompanhar a evolução ao longo do tempo.",
            "O diagnóstico e as decisões de tratamento ficam com o neurologista e a equipe que acompanha o caso.",
        ],
        helpsRefs: [1, 2],
        faq: [
            {
                question: "Quanto tempo após o AVC ou TCE posso fazer a avaliação?",
                answer: "O momento é indicado pelo neurologista, conforme a recuperação e o objetivo da avaliação.",
            },
            {
                question: "Preciso levar exames de imagem?",
                answer: "Leve os laudos dos exames que você já tem, como tomografia, ressonância ou eletroencefalograma, e o pedido médico. Eles ajudam a entender o caso. A avaliação não pede exames novos.",
            },
            {
                question: "A avaliação indica reabilitação?",
                answer: "O laudo pode recomendar reabilitação neuropsicológica e outras terapias quando os resultados mostram essa necessidade. A decisão sobre o tratamento é tomada com o médico e a equipe.",
            },
        ],
        references: [
            DONDERS,
            {
                text: "Cicerone KD et al. Evidence-based cognitive rehabilitation: systematic review of the literature from 2009 through 2014. Arch Phys Med Rehabil. 2019;100(8):1515-1533.",
                doi: "10.1016/j.apmr.2019.02.011",
            },
        ],
    },
];

export function getCondition(slug: string): Condition | undefined {
    return conditions.find((c) => c.slug === slug);
}

export const conditionPath = (slug: string) => `${AVALIACAO_PATH}/${slug}`;
