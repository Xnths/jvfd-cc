// Copy for the service landing pages. Each text is the default of an <SE> in ServicePage.tsx, so João can edit it in
// place. Rules (CFP Res. 010/2005, Art. 20): full name and CRP, only real titles, no prices, no predicted results, no
// comparison with other professionals, nothing sensational. Findings describe the field, never João's own results, and
// every claim must be supported by the cited paper. No parcelamento anywhere. WhatsApp texts live in Postgres: don't touch.

import type { LandingTheme } from "@/lib/service-themes";

export type LandingImage = { src: string; alt: string; width: number; height: number; caption?: string };

export type ServiceLanding = {
    theme: LandingTheme;
    hero: { badge: string; title: string; subtitle: string; facts?: string[]; cta: string; note: string; image?: LandingImage };
    /** Crisis pages: shown first, before anything else. */
    safety?: { title: string; text: string; actions: { label: string; detail: string; href: string }[] };
    strip: string[];
    when: { eyebrow: string; title: string; intro: string; groups: { title: string; text: string; items: string[] }[] };
    bodyImage?: LandingImage;
    research: { eyebrow: string; title: string; findings: { text: string; refs: number[] }[]; caveat: string };
    steps: { eyebrow: string; title: string; items: { title: string; text: string }[] };
    about: { eyebrow: string; title: string; text: string; image: LandingImage };
    faqTitle: string;
    faq: { question: string; answer: string }[];
    closing: { eyebrow: string; title: string; cta: string; note?: string };
    referencesTitle: string;
    references: { n: number; text: string; doi?: string }[];
};

// Three photos of João (public/about/). Close-up for clinical/serious pages, standing for warm ones, seated for "explaining" ones.
const JV: LandingImage = { src: "/about/joao-1.jpg", alt: "Psicólogo João Fernandes", width: 640, height: 858 };
const JV_STANDING: LandingImage = { src: "/about/joao-2.jpg", alt: "Psicólogo João Fernandes", width: 600, height: 828 };
const JV_SEATED: LandingImage = { src: "/about/joao-3.jpg", alt: "Psicólogo João Fernandes", width: 618, height: 740 };
const OFFICE: LandingImage = { src: "/consultorio.jpg", alt: "Consultório na Vila Madalena, São Paulo", width: 2912, height: 1440, caption: "Consultório na Vila Madalena." };

const CRP = "CRP 06/157908";
const WHO = `João Vitor Fernandes, psicólogo clínico, ${CRP}`;
const FORMATION = "bacharel em Psicologia pela PUC-SP, com pós-graduação em Neuropsicologia pelo Hospital Israelita Albert Einstein e em Neurociências, Comportamento e Psicopatologia pela PUCPR";
const ADDRESS = "Rua Harmonia, 1323, Vila Madalena (Sumarezinho), São Paulo";
const PLACE = `Atende online e presencialmente, na ${ADDRESS}, de segunda a sexta, das 8h às 21h.`;
const NAME_STRIP = `João Vitor Fernandes · ${CRP}`;

const FAQ_CONVENIO = {
    question: "Aceita convênio médico?",
    answer: "Não. O atendimento é particular, sem convênio. João emite recibo para você solicitar o reembolso ao seu plano de saúde; a cobertura e os documentos exigidos dependem do seu contrato.",
};
const FAQ_VALOR = { question: "Quais são os valores?", answer: "Os valores são informados diretamente por João, pelo WhatsApp." };
const FAQ_AGENDAR = { question: "Como agendo?", answer: "Pelo WhatsApp, com uma mensagem curta. Os horários são de segunda a sexta, das 8h às 21h." };

const REF = {
    cuijpers: "Cuijpers P et al. Cognitive behavior therapy vs. control conditions, other psychotherapies, pharmacotherapies and combined treatment for depression: a comprehensive meta-analysis including 409 trials with 52,702 patients. World Psychiatry. 2023;22(1):105-115.",
    ekers: "Ekers D et al. Behavioural activation for depression; an update of meta-analysis of effectiveness and sub group analysis. PLoS One. 2014;9(6):e100100.",
    fluckiger: "Flückiger C et al. The alliance in adult psychotherapy: a meta-analytic synthesis. Psychotherapy. 2018;55(4):316-340.",
    swift: "Swift JK, Greenberg RP. Premature discontinuation in adult psychotherapy: a meta-analysis. J Consult Clin Psychol. 2012;80(4):547-59.",
    dunlosky: "Dunlosky J et al. Improving students' learning with effective learning techniques. Psychol Sci Public Interest. 2013;14(1):4-58.",
    rozental: "Rozental A et al. Treating procrastination using cognitive behavior therapy: a pragmatic randomized controlled trial. Behav Ther. 2018;49(2):180-197.",
    lopez: "Lopez PL et al. Cognitive-behavioural interventions for attention deficit hyperactivity disorder (ADHD) in adults. Cochrane Database Syst Rev. 2018;3:CD010840.",
    stanley: "Stanley B et al. Comparison of the Safety Planning Intervention with follow-up vs usual care of suicidal patients treated in the emergency department. JAMA Psychiatry. 2018;75(9):894-900.",
    nuij: "Nuij C et al. Safety planning-type interventions for suicide prevention: meta-analysis. Br J Psychiatry. 2021;219(2):419-426.",
    roddy: "Roddy MK et al. Meta-analysis of couple therapy: effects across outcomes, designs, timeframes, and other moderators. J Consult Clin Psychol. 2020;88(7):583-596.",
    bradbury: "Bradbury TN, Bodenmann G. Interventions for couples. Annu Rev Clin Psychol. 2020;16:99-123.",
    vanAgteren: "van Agteren J et al. A systematic review and meta-analysis of psychological interventions to improve mental wellbeing. Nat Hum Behav. 2021;5(5):631-652.",
    gulliver: "Gulliver A, Griffiths KM, Christensen H. Perceived barriers and facilitators to mental health help-seeking in young people: a systematic review. BMC Psychiatry. 2010;10:113.",
    alfonsson18: "Alfonsson S et al. The effects of clinical supervision on supervisees and patients in cognitive behavioral therapy: a systematic review. Cogn Behav Ther. 2018;47(3):206-228.",
    alfonsson20: "Alfonsson S, Lundgren T, Andersson G. Clinical supervision in cognitive behavior therapy improves therapists' competence: a single-case experimental pilot study. Cogn Behav Ther. 2020;49(5):425-438.",
    meyer: "Meyer IH. Prejudice, social stress, and mental health in lesbian, gay, and bisexual populations. Psychol Bull. 2003;129(5):674-697.",
    pachankis: "Pachankis JE et al. LGB-affirmative cognitive-behavioral therapy for young adult gay and bisexual men: a randomized controlled trial. J Consult Clin Psychol. 2015;83(5):875-89.",
    clement: "Clement S et al. What is the impact of mental health-related stigma on help-seeking? A systematic review. Psychol Med. 2015;45(1):11-27.",
};

export function faqDisplay<T extends { question: string }>(faq: T[]): { item: T; i: number }[] {
    const all = faq.map((item, i) => ({ item, i }));
    const at = all.findIndex((x) => /conv[eê]nio/i.test(x.item.question));
    if (at <= 0) return all;
    return [all[at], ...all.slice(0, at), ...all.slice(at + 1)];
}

const COMMON = { faqTitle: "Perguntas frequentes", referencesTitle: "Referências" };

export const serviceLandings: Record<string, ServiceLanding> = {
    "avaliacao-neuropsicologica": {
        ...COMMON,
        theme: "green",
        hero: {
            badge: "Avaliação Neuropsicológica",
            title: "Avaliação neuropsicológica",
            subtitle: "Entenda como você ou seu filho prestam atenção, lembram, se organizam e se comunicam, com testes padronizados, laudo escrito e uma sessão de devolutiva.",
            cta: "Agendar avaliação com pedido médico",
            note: "Consulta particular, sem convênio; João emite recibo para reembolso. Presencial na Vila Madalena. Para crianças e adolescentes, o agendamento é feito por um responsável.",
            image: JV,
        },
        strip: ["Pós-graduação em Neuropsicologia · Hospital Israelita Albert Einstein", "Psicologia pela PUC-SP", CRP, "Adultos, adolescentes e crianças", "Presencial na Vila Madalena"],
        when: {
            eyebrow: "Quando procurar",
            title: "Para que serve uma avaliação neuropsicológica",
            intro: "A avaliação reúne dados objetivos sobre o funcionamento cognitivo. Ela pode ajudar a esclarecer uma queixa, apoiar o trabalho do médico e de outros profissionais e orientar o cuidado, escolar, profissional e familiar.",
            groups: [
                { title: "Desenvolvimento e aprendizagem", text: "Contribui para a investigação diagnóstica e mostra pontos fortes e dificuldades de cada pessoa.", items: ["TDAH", "Autismo (TEA)", "Dificuldades de leitura, escrita e matemática", "Queixas escolares e de desempenho"] },
                { title: "Saúde mental", text: "Ajuda a entender o impacto cognitivo do quadro no dia a dia e a planejar o cuidado.", items: ["Depressão", "Transtorno bipolar", "Transtornos de personalidade, como o borderline", "Esquizofrenia e outros quadros psiquiátricos"] },
                { title: "Neurologia e envelhecimento", text: "Documenta o funcionamento cognitivo e permite acompanhar mudanças ao longo do tempo.", items: ["Queixas de memória", "Comprometimento cognitivo leve e demências", "Traumatismo craniano e AVC", "Epilepsia e esclerose múltipla"] },
            ],
        },
        research: {
            eyebrow: "O que a pesquisa mostra",
            title: "Uma ferramenta com respaldo científico",
            findings: [
                { text: "Revisão crítica de 56 estudos concluiu que a avaliação neuropsicológica melhora a classificação diagnóstica e a previsão de desfechos na vida diária, com evidência forte em comprometimento cognitivo leve, demência e traumatismo craniano.", refs: [1] },
                { text: "Uma revisão sistemática de 81 estudos com adultos encontrou evidência geralmente favorável para a acurácia diagnóstica e para o benefício percebido por médicos e pacientes.", refs: [2] },
                { text: "Em quadros psiquiátricos, alterações de atenção e funções executivas podem persistir mesmo quando o humor melhora (depressão) e atravessar diferentes fases da doença (transtorno bipolar). Mapeá-las ajuda a planejar o tratamento.", refs: [3, 4] },
                { text: "A revisão da literatura recomenda que o resultado seja explicado em uma sessão de devolutiva, de preferência com material escrito, o que ajuda a lembrar e a seguir as orientações.", refs: [5] },
            ],
            caveat: "A avaliação não decide um diagnóstico sozinha: o diagnóstico é clínico e usa várias fontes de informação. Os próprios pesquisadores apontam que ainda faltam ensaios controlados sobre o efeito no tratamento.",
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
            text: `Psicólogo clínico, ${CRP}, bacharel em Psicologia pela PUC-SP, com pós-graduação em Neuropsicologia pelo Hospital Israelita Albert Einstein. A avaliação é presencial, no consultório na Vila Madalena (${ADDRESS}), de segunda a sexta, das 8h às 21h.`,
            image: OFFICE,
        },
        faq: [
            { question: "Aceita convênio médico?", answer: "Não. João não atende por convênio médico: a avaliação neuropsicológica é uma consulta particular. Ele emite recibo para você solicitar o reembolso ao seu plano de saúde." },
            { question: "Como funciona o reembolso?", answer: "Você faz a consulta particular, recebe o recibo e pede o reembolso diretamente ao seu plano. A cobertura e os documentos exigidos dependem do seu contrato, por isso vale confirmar com a operadora antes de começar." },
            { question: "Preciso de pedido médico?", answer: "Sim. A avaliação é agendada com pedido médico. Se ainda não tiver o seu, tire suas dúvidas pelo WhatsApp antes de conversar com seu médico." },
            { question: "A avaliação dá um diagnóstico?", answer: "Os testes não fecham um diagnóstico sozinhos. Os resultados são analisados junto com a entrevista e a história de vida, e o laudo pode apoiar o trabalho do médico e de outros profissionais que acompanham você." },
            { question: "O que eu recebo ao final?", answer: "Um laudo escrito e uma sessão de devolutiva para conversar sobre os resultados." },
            { question: "Quanto tempo leva?", answer: "Em geral, de 4 a 6 sessões, de até 2 horas cada. O número exato de encontros depende do caso." },
            { question: "Atende crianças?", answer: "Sim, a avaliação é feita com adultos, adolescentes e crianças. Para menores de 18 anos, o contato, o agendamento e a autorização são feitos por um responsável." },
            { question: "A avaliação é online?", answer: "Não. A avaliação neuropsicológica é realizada somente de forma presencial, no consultório na Vila Madalena." },
            FAQ_VALOR,
            { question: "Como agendo?", answer: "Pelo WhatsApp, de segunda a sexta, das 8h às 21h." },
            // Keys are index based (faq_<i>_q): new questions go at the end, or saved edits would land on the wrong question.
            { question: "O que é avaliação neuropsicológica?", answer: "É um processo estruturado que investiga o funcionamento cognitivo, como atenção, memória, linguagem e funções executivas, por meio de entrevista e testes padronizados. Os resultados são relacionados à história e à rotina da pessoa e registrados em um laudo." },
            { question: "Quem pode realizar a avaliação neuropsicológica?", answer: "No Brasil, o uso de testes psicológicos é privativo de psicólogas e psicólogos (Resolução CFP 31/2022). Aqui, a avaliação é conduzida por João Vitor Fernandes Domingues, psicólogo, CRP 06/157908, com pós-graduação em Neuropsicologia pelo Hospital Israelita Albert Einstein." },
            { question: "Qual a diferença entre avaliação psicológica e avaliação neuropsicológica?", answer: "A avaliação psicológica investiga fenômenos psicológicos de forma ampla, a partir de uma demanda específica. A avaliação neuropsicológica dá ênfase às funções cognitivas e à relação delas com o funcionamento do cérebro." },
            { question: "Onde fazer avaliação neuropsicológica na Vila Madalena?", answer: `O consultório de João fica na ${ADDRESS}. O atendimento é presencial, para adultos, adolescentes e crianças (menores de 18 anos com um responsável), de segunda a sexta, das 8h às 21h, com pedido médico.` },
        ],
        closing: { eyebrow: "Próximo passo", title: "Tem um pedido médico e dúvidas sobre o processo?", cta: "Agendar avaliação com pedido médico", note: "Pedido médico necessário · particular, sem convênio · recibo para reembolso · presencial · em geral, 4 a 6 sessões de até 2 horas." },
        references: [
            { n: 1, text: "Donders J. The incremental value of neuropsychological assessment: a critical review. Clin Neuropsychol. 2020;34(1):56-87.", doi: "10.1080/13854046.2019.1575471" },
            { n: 2, text: "Watt S, Crowe SF. Examining the beneficial effect of neuropsychological assessment on adult patient outcomes: a systematic review. Clin Neuropsychol. 2018;32(3):368-390.", doi: "10.1080/13854046.2017.1414885" },
            { n: 3, text: "Rock PL et al. Cognitive impairment in depression: a systematic review and meta-analysis. Psychol Med. 2014;44(10):2029-40.", doi: "10.1017/S0033291713002535" },
            { n: 4, text: "Nicoloro-SantaBarbara J et al. Cognition in bipolar disorder: an update for clinicians. Focus. 2023;21(4):363-369.", doi: "10.1176/appi.focus.20230012" },
            { n: 5, text: "Gruters AAA et al. A scoping review of communicating neuropsychological test results to patients and family members. Neuropsychol Rev. 2022;32(2):294-315.", doi: "10.1007/s11065-021-09507-2" },
        ],
    },

    psicoterapia: {
        ...COMMON,
        theme: "teal",
        hero: {
            badge: "Psicoterapia online · Adultos",
            title: "Psicoterapia individual online",
            subtitle: "Para adultos que querem entender o que mantém o próprio sofrimento e construir outras formas de lidar com ele. Em português, no Brasil ou no exterior.",
            facts: [
                "Sessões individuais de cerca de 50 minutos, em geral semanais, por videochamada.",
                "Atendimento particular: não atende convênio; emite recibo para reembolso.",
                "Bacharel em Psicologia pela PUC-SP · Pós-graduação em Neuropsicologia, Hospital Israelita Albert Einstein · CRP 06/157908 · Atua desde 2019.",
                "Primeiro contato pelo WhatsApp: João retorna com horários e valores. A primeira sessão serve para entender sua demanda.",
            ],
            cta: "Agendar sessão pelo WhatsApp",
            note: "Particular, sem convênio, com recibo para reembolso. Valores informados por João no WhatsApp. Adolescentes de 13 a 17 anos: caso a caso, com contato e agendamento feitos por um responsável.",
            image: { src: "/servicos/sessao-terapia.jpg", alt: "Ilustração de uma sessão de psicoterapia em um consultório", width: 1408, height: 768, caption: "Ilustração de uma sessão de psicoterapia." },
        },
        strip: [NAME_STRIP, "Análise do Comportamento", "Online para o Brasil e o exterior", "Atendimento sigiloso"],
        when: {
            eyebrow: "Quando procurar",
            title: "Você não precisa estar no limite para começar",
            intro: "A psicoterapia pode ajudar em momentos de sofrimento e também quando você quer se conhecer melhor e cuidar da saúde mental.",
            groups: [
                { title: "Emoções difíceis", text: "Quando o que você sente começa a atrapalhar a rotina, o trabalho ou as relações.", items: ["Ansiedade", "Depressão", "Estresse", "Luto"] },
                { title: "Quadros que pedem acompanhamento", text: "Em alguns casos, a psicoterapia caminha junto com o acompanhamento médico.", items: ["Transtorno bipolar", "Transtornos de personalidade", "Impactos de doenças físicas", "Dificuldades que se repetem há anos"] },
                { title: "Relações e escolhas", text: "Quando você quer entender padrões e decidir com mais clareza.", items: ["Conflitos no relacionamento", "Pressões sociais e familiares", "Autoconhecimento", "Cuidado com a saúde mental"] },
            ],
        },
        bodyImage: OFFICE,
        research: {
            eyebrow: "O que a pesquisa mostra",
            title: "Psicoterapia é um tratamento estudado",
            findings: [
                { text: "Uma meta-análise reuniu 409 ensaios e 52.702 pacientes e documentou a eficácia da terapia cognitivo-comportamental na depressão, com efeitos ainda presentes de 6 a 12 meses depois.", refs: [1] },
                { text: "A ativação comportamental, técnica de tradição comportamental, teve resultado superior ao de grupos de controle em 26 ensaios sobre depressão, embora a qualidade da maioria dos estudos fosse baixa.", refs: [2] },
                { text: "Em 295 estudos com mais de 30 mil pacientes, uma boa relação entre paciente e terapeuta esteve associada a melhores resultados, em diferentes abordagens. Por isso, se sentir à vontade para falar conta.", refs: [3] },
                { text: "Cerca de 1 em cada 5 pessoas interrompe a terapia antes do combinado. Conversar sobre o plano e as expectativas desde o início faz parte do processo.", refs: [4] },
            ],
            caveat: "Os estudos descrevem grupos de pessoas. Cada processo é único e os resultados variam de pessoa para pessoa.",
        },
        steps: {
            eyebrow: "Como funciona",
            title: "O que esperar do processo",
            items: [
                { title: "Primeiro contato", text: "Uma mensagem curta pelo WhatsApp para combinar dia, horário e formato." },
                { title: "Primeira sessão", text: "João explica como trabalha, tira suas dúvidas e vocês identificam as demandas de curto, médio e longo prazo." },
                { title: "Plano combinado", text: "Vocês definem juntos o plano e a frequência. Na maior parte das vezes, as sessões são semanais e duram cerca de 50 minutos." },
                { title: "Acompanhamento", text: "As sessões seguem o plano, que é revisto ao longo do tempo conforme seus objetivos." },
            ],
        },
        about: { eyebrow: "Quem conduz", title: "João Vitor Fernandes", text: `${WHO}, ${FORMATION}. Trabalha com Psicologia Analítico-Comportamental. ${PLACE}`, image: JV },
        faq: [
            { question: "Nunca fiz terapia. E agora?", answer: "É comum não saber como se comportar na primeira sessão, e esse receio é parte do processo. João explica tudo com calma e conduz a conversa. Você não precisa chegar com nada preparado." },
            { question: "Já fiz terapia e não foi uma boa experiência. Vale tentar de novo?", answer: "Uma experiência ruim pesa, e é legítimo chegar com desconfiança. Você pode contar o que não funcionou, perguntar como João trabalha e conferir a formação dele aqui no site. Se algo não fizer sentido durante o processo, isso também é assunto para a sessão." },
            { question: "Já passei por outras abordagens. Muda muito?", answer: "A abordagem comportamental é explicada na prática, ao longo das sessões. Pessoas diferentes se adaptam a abordagens diferentes, e está tudo bem. Você pode experimentar e decidir com base no que viver no processo." },
            { question: "Quanto dura a terapia?", answer: "As sessões duram cerca de 50 minutos e costumam ser semanais. A duração total varia conforme seus objetivos e é conversada com transparência." },
            { question: "É online ou presencial?", answer: "Como você preferir: por videochamada ou no consultório na Vila Madalena." },
            FAQ_CONVENIO,
            FAQ_VALOR,
            FAQ_AGENDAR,
            { question: "Atende adolescentes?", answer: "A psicoterapia é voltada a adultos. Adolescentes de 13 a 17 anos são avaliados caso a caso, e o contato e o agendamento precisam ser feitos por um responsável, que autoriza o acompanhamento." },
            { question: "Atende brasileiros que moram fora do Brasil?", answer: "Sim, por videochamada e em português. Combine o horário levando em conta o fuso entre o seu país e São Paulo." },
            { question: "Também há atendimento presencial?", answer: "Sim, no consultório na Vila Madalena, em São Paulo. Veja a página de atendimento presencial para o endereço e como chegar." },
        ],
        closing: { eyebrow: "Próximo passo", title: "Você não precisa ter certeza para começar.", cta: "Agendar sessão pelo WhatsApp", note: "Particular, sem convênio · recibo para reembolso · sessões online de cerca de 50 minutos · menores de 18 anos: contato por um responsável." },
        references: [
            { n: 1, text: REF.cuijpers, doi: "10.1002/wps.21069" },
            { n: 2, text: REF.ekers, doi: "10.1371/journal.pone.0100100" },
            { n: 3, text: REF.fluckiger, doi: "10.1037/pst0000172" },
            { n: 4, text: REF.swift, doi: "10.1037/a0028226" },
        ],
    },

    "foco-organizacao": {
        ...COMMON,
        theme: "slate",
        hero: {
            badge: "Foco & Organização",
            title: "Foco e organização",
            subtitle: "Psicoterapia voltada ao comportamento de estudo e à rotina, para quem tem dificuldade de concentração, adia tarefas ou se prepara para provas.",
            cta: "Conversar sobre foco e estudo",
            note: "Online ou presencial. Atendimento particular, sem convênio, com recibo para reembolso. Para adultos e universitários; adolescentes caso a caso, com agendamento por um responsável.",
            image: { src: "/servicos/dificuldade-estudo.jpg", alt: "Ilustração de uma pessoa frustrada diante de livros, com a mente embaralhada", width: 2400, height: 1792, caption: "Ilustração: quando estudar deixa de render." },
        },
        strip: [NAME_STRIP, "Pós-graduação em Neurociências, Comportamento e Psicopatologia · PUCPR", "Pós-graduação em Neuropsicologia · Einstein", "Online e presencial"],
        when: {
            eyebrow: "Quando procurar",
            title: "Quando a dificuldade não é falta de vontade",
            intro: "Adiar tarefas e perder o foco costumam ter relação com a rotina, o ambiente e a forma de estudar. Isso pode ser observado e trabalhado na psicoterapia.",
            groups: [
                { title: "Estudos e provas", text: "Para quem precisa manter uma rotina longa de preparação.", items: ["Vestibulares", "Concursos", "Provas de residência médica", "Ansiedade em provas"] },
                { title: "Foco e rotina", text: "Para quando a organização do dia a dia deixa de funcionar.", items: ["Dificuldade de concentração", "Procrastinação", "Desorganização", "Queda de rendimento"] },
                { title: "Diagnósticos que afetam o aprendizado", text: "O acompanhamento também pode ajudar quem já tem um diagnóstico.", items: ["TDAH", "Ansiedade", "Dislexia", "Disortografia"] },
            ],
        },
        bodyImage: { src: "/servicos/ansiedade-prova.jpg", alt: "Ilustração de um homem preocupado durante uma prova em sala de aula", width: 2400, height: 1792, caption: "Ilustração: ansiedade em situação de prova." },
        research: {
            eyebrow: "O que a pesquisa mostra",
            title: "Estudar de um jeito diferente faz diferença",
            findings: [
                { text: "Uma revisão de 10 técnicas de estudo classificou fazer testes de prática e distribuir o estudo no tempo como as de maior utilidade.", refs: [1] },
                { text: "A mesma revisão classificou reler e grifar, técnicas muito usadas, como de baixa utilidade. Às vezes, o que atrapalha é o jeito de estudar, e não a falta de esforço.", refs: [1] },
                { text: "Em um ensaio com 92 universitários com procrastinação grave, cerca de um terço foi considerado melhor ao fim de 8 semanas de terapia cognitivo-comportamental, e perto da metade seis meses depois.", refs: [2] },
                { text: "Uma revisão Cochrane encontrou evidência de baixa qualidade de que intervenções cognitivo-comportamentais podem beneficiar adultos com TDAH no curto prazo.", refs: [3] },
            ],
            caveat: "O estudo sobre procrastinação não teve grupo sem tratamento, e faltam dados de longo prazo sobre TDAH. Os resultados variam de pessoa para pessoa.",
        },
        steps: {
            eyebrow: "Como funciona",
            title: "Da observação da rotina à prática",
            items: [
                { title: "Entender a demanda", text: "O que você precisa estudar ou fazer, em que prazo e o que tem atrapalhado." },
                { title: "Observar a rotina", text: "Vocês olham para o ambiente, os horários e o que acontece antes e depois de adiar uma tarefa." },
                { title: "Testar estratégias", text: "João ensina técnicas comportamentais de estudo e organização, ajustadas ao seu ritmo." },
                { title: "Revisar", text: "O que funcionou fica, o que não funcionou é ajustado nas sessões seguintes." },
            ],
        },
        about: { eyebrow: "Quem conduz", title: "João Vitor Fernandes", text: `${WHO}, ${FORMATION}. ${PLACE}`, image: JV_SEATED },
        faq: [
            { question: "Preciso ter um diagnóstico para começar?", answer: "Não. O atendimento é para quem tem dificuldade de foco, organização ou estudo, com ou sem diagnóstico." },
            { question: "Isso substitui o tratamento de TDAH?", answer: "Não. A psicoterapia pode caminhar junto com o acompanhamento médico. As decisões sobre medicação são sempre do seu médico." },
            { question: "Serve para quem não está estudando para prova?", answer: "Sim. O trabalho também pode ajudar quem quer organizar a rotina e lidar com a procrastinação no trabalho e na vida pessoal." },
            { question: "Como descubro se tenho TDAH?", answer: "Só uma avaliação clínica pode responder. Se fizer sentido no seu caso, João conversa com você sobre os caminhos possíveis, como a avaliação neuropsicológica." },
            { question: "É online ou presencial?", answer: "Como você preferir: por videochamada ou no consultório na Vila Madalena." },
            FAQ_CONVENIO,
            FAQ_VALOR,
            FAQ_AGENDAR,
        ],
        closing: { eyebrow: "Próximo passo", title: "Conte o que tem atrapalhado sua rotina.", cta: "Conversar sobre foco e estudo", note: "Particular, sem convênio · recibo para reembolso · online ou presencial · menores de 18 anos: contato por um responsável." },
        references: [
            { n: 1, text: REF.dunlosky, doi: "10.1177/1529100612453266" },
            { n: 2, text: REF.rozental, doi: "10.1016/j.beth.2017.08.002" },
            { n: 3, text: REF.lopez, doi: "10.1002/14651858.CD010840.pub2" },
        ],
    },

    plantao: {
        ...COMMON,
        theme: "green",
        hero: {
            badge: "Plantão Psicológico",
            title: "Plantão psicológico",
            subtitle: "Acolhimento psicológico para momentos de sofrimento intenso, como perdas, separações e crises de ansiedade.",
            cta: "Enviar mensagem pelo WhatsApp",
            note: "O WhatsApp não é um serviço de emergência e a resposta pode não ser imediata.",
        },
        safety: {
            title: "Risco imediato à sua vida ou à de outra pessoa?",
            text: "Não espere resposta por aqui. Ligue para o SAMU ou vá ao pronto-socorro mais próximo. Se precisar conversar agora, o CVV atende 24 horas por dia, sem custo de ligação.",
            actions: [
                { label: "SAMU 192", detail: "Emergência", href: "tel:192" },
                { label: "CVV 188", detail: "Apoio emocional, 24 horas", href: "tel:188" },
            ],
        },
        strip: [NAME_STRIP, "Acolhimento e plano de ação", "Encaminhamento quando necessário"],
        when: {
            eyebrow: "Quando procurar",
            title: "Momentos em que o plantão pode ajudar",
            intro: "Você não precisa saber explicar o que está acontecendo. Uma mensagem curta é suficiente para começar.",
            groups: [
                { title: "Perdas e rupturas", text: "Quando algo muda de repente e fica difícil organizar os próximos passos.", items: ["Perdas significativas", "Separações", "Problemas sérios no relacionamento"] },
                { title: "Crises emocionais", text: "Quando a intensidade do que você sente dificulta pensar com clareza.", items: ["Crises de ansiedade", "Episódios depressivos", "Desregulação emocional", "Dependências e vícios"] },
            ],
        },
        bodyImage: { src: "/servicos/processo-terapeutico.jpg", alt: "Ilustração suave de duas poltronas cercadas por ícones de escuta, tempo e cuidado", width: 1024, height: 1024, caption: "Ilustração: acolhimento e continuidade do cuidado." },
        steps: {
            eyebrow: "Como funciona",
            title: "O que acontece depois da mensagem",
            items: [
                { title: "Acolhimento", text: "O foco é entender o que está acontecendo agora e ajudar a acalmar o momento." },
                { title: "Plano de ação", text: "Vocês constroem um plano para a situação, com as opções disponíveis e encaminhamentos possíveis." },
                { title: "Continuidade", text: "A crise é um momento pontual. Depois dela, é pensado um plano de mais longo prazo para trabalhar o que está na origem do problema." },
            ],
        },
        research: {
            eyebrow: "O que a pesquisa mostra",
            title: "Por que ter um plano importa",
            findings: [
                { text: "Em emergências hospitalares dos Estados Unidos, um plano de segurança com acompanhamento por telefone foi associado a menos comportamento suicida em 6 meses e a mais comparecimento ao atendimento em saúde mental.", refs: [1] },
                { text: "Uma meta-análise de 6 estudos, com 3.536 participantes, encontrou menor risco de comportamento suicida entre quem recebeu esse tipo de plano. Não houve efeito significativo sobre os pensamentos suicidas.", refs: [2] },
            ],
            caveat: "Esses estudos foram feitos em serviços de saúde e não substituem o atendimento de emergência. Em caso de risco, ligue 192 ou 188.",
        },
        about: { eyebrow: "Quem atende", title: "João Vitor Fernandes", text: `${WHO}, ${FORMATION}, com aperfeiçoamento em Psicologia Hospitalar.`, image: JV },
        faq: [
            { question: "Quando posso enviar uma mensagem?", answer: "Quando estiver passando por um momento difícil e quiser apoio psicológico. Mas o WhatsApp não é um serviço de emergência, e a resposta pode não ser imediata." },
            { question: "O plantão funciona 24 horas?", answer: "Não é um serviço 24 horas. Para apoio emocional a qualquer hora, ligue para o CVV no 188 ou acesse cvv.org.br. Em emergências, ligue para o SAMU no 192." },
            { question: "O que faço se eu estiver pensando em tirar a minha vida?", answer: "Procure ajuda agora: ligue 192 ou vá ao pronto-socorro mais próximo. Você também pode ligar 188 e conversar com o CVV a qualquer hora. Se possível, fique perto de alguém de confiança." },
            { question: "O plantão substitui a terapia?", answer: "Não. O acolhimento é pontual. O mais importante é tratar a causa do problema, e por isso também é pensado um plano de mais longo prazo." },
            { question: "Aceita convênio médico?", answer: FAQ_CONVENIO.answer },
            FAQ_VALOR,
        ],
        closing: { eyebrow: "Próximo passo", title: "Você não precisa passar por isso sem apoio.", cta: "Enviar mensagem pelo WhatsApp" },
        references: [
            { n: 1, text: REF.stanley, doi: "10.1001/jamapsychiatry.2018.1776" },
            { n: 2, text: REF.nuij, doi: "10.1192/bjp.2021.50" },
        ],
    },

    "terapia-de-casal": {
        ...COMMON,
        theme: "amber",
        hero: {
            badge: "Terapia de Casal",
            title: "Terapia de casal",
            subtitle: "Para casais que querem entender seus conflitos, conversar de outra forma e tomar decisões com mais clareza.",
            cta: "Agendar uma sessão para vocês",
            note: "Online ou presencial, para adultos. Começa com uma sessão prévia para alinhar o processo. Atendimento particular, sem convênio, com recibo para reembolso.",
            image: { src: "/servicos/casal-conversa.jpg", alt: "Ilustração de um casal de dois homens em casa: um tenta conversar enquanto o outro, de fones de ouvido, não presta atenção", width: 2914, height: 1440, caption: "Ilustração: quando a conversa deixa de acontecer." },
        },
        strip: [NAME_STRIP, "Análise do Comportamento", "Online e presencial", "Sessão prévia com o casal"],
        when: {
            eyebrow: "Quando procurar",
            title: "Quando os dois querem olhar para a relação",
            intro: "O foco da terapia de casal é a relação. O objetivo é entender o que cada pessoa pode fazer para que o casal tenha qualidade de vida e consiga tomar decisões.",
            groups: [
                { title: "Conflitos", text: "Quando as mesmas discussões voltam e nada parece mudar.", items: ["Brigas que se repetem", "Dificuldade de conversar", "Inseguranças na relação", "Distância no dia a dia"] },
                { title: "Decisões e limites", text: "Quando vocês precisam definir como seguir.", items: ["Limites saudáveis", "Decisões sobre a relação", "Dinâmicas com a família"] },
                { title: "Quando a terapia individual faz mais sentido", text: "A questão do relacionamento também pode ser trabalhada individualmente.", items: ["Só uma pessoa quer participar", "A demanda é principalmente sua", "Há violência ou medo na relação"] },
            ],
        },
        bodyImage: OFFICE,
        research: {
            eyebrow: "O que a pesquisa mostra",
            title: "Terapia de casal é estudada, e tem limites",
            findings: [
                { text: "Uma meta-análise de 58 estudos, com 2.092 casais, encontrou aumento da satisfação com a relação após a terapia, enquanto casais em lista de espera não melhoraram de forma significativa. Também houve ganhos em comunicação e intimidade.", refs: [1] },
                { text: "Uma revisão estima que de 60% a 80% dos casais em sofrimento se beneficiam de abordagens comportamentais e focadas nas emoções. Na prática clínica, porém, os efeitos são menores e, para cerca de metade dos casais, diminuem depois do fim do tratamento.", refs: [2] },
            ],
            caveat: "A meta-análise incluiu apenas casais de sexos diferentes, e faltam estudos com casais do mesmo sexo. Cada relação é única, e terapia de casal não tem como prometer um resultado.",
        },
        steps: {
            eyebrow: "Como funciona",
            title: "Como o processo começa",
            items: [
                { title: "Contato", text: "Uma mensagem pelo WhatsApp para tirar dúvidas e combinar a sessão prévia." },
                { title: "Sessão prévia", text: "Com o casal, para alinhar o que é essa modalidade e o que esperar dela." },
                { title: "Sessões com os dois", text: "As duas pessoas participam ao longo do processo. Quando possível, o presencial é mais indicado." },
                { title: "Decisões", text: "Vocês trabalham limites e decisões, no ritmo e com os objetivos do casal." },
            ],
        },
        about: { eyebrow: "Quem conduz", title: "João Vitor Fernandes", text: `${WHO}, ${FORMATION}. ${PLACE}`, image: JV_STANDING },
        faq: [
            { question: "A terapia vai salvar o relacionamento?", answer: "O objetivo não é fazer ninguém terminar nem fazer com que fiquem juntos para sempre. É verificar o que cada um pode fazer para que o casal tenha qualidade de vida e tome decisões." },
            { question: "Os dois precisam participar?", answer: "Sim, a disponibilidade das duas pessoas é indispensável na terapia de casal. Se só uma quiser participar, a psicoterapia individual também pode trabalhar questões do relacionamento." },
            { question: "E se houver violência ou medo na relação?", answer: "Nesses casos, a terapia de casal pode não ser o caminho adequado. Fale com João individualmente para conversar sobre as opções. Em caso de risco imediato, ligue 190. Mulheres também podem ligar para a Central de Atendimento à Mulher, no 180." },
            { question: "Atende casais LGBTQIA+?", answer: "Sim. João atende pessoas LGBTQIA+ de forma afirmativa, com respeito à identidade e à história de cada pessoa." },
            { question: "É online ou presencial?", answer: "Pode ser dos dois jeitos. Quando possível, o presencial é mais indicado para esta demanda." },
            FAQ_CONVENIO,
            FAQ_VALOR,
            FAQ_AGENDAR,
        ],
        closing: { eyebrow: "Próximo passo", title: "Comecem com uma sessão prévia para entender o processo.", cta: "Agendar uma sessão para vocês", note: "Particular, sem convênio · recibo para reembolso · online ou presencial · sessão prévia com o casal." },
        references: [
            { n: 1, text: REF.roddy, doi: "10.1037/ccp0000514" },
            { n: 2, text: REF.bradbury, doi: "10.1146/annurev-clinpsy-071519-020546" },
        ],
    },

    autoconhecimento: {
        ...COMMON,
        theme: "stone",
        hero: {
            badge: "Autoconhecimento",
            title: "Autoconhecimento",
            subtitle: "Para quem sente que algo precisa mudar, mas ainda não sabe dar nome. Não é preciso ter uma questão específica para começar.",
            cta: "Agendar uma conversa",
            note: "Sessões guiadas de cerca de 50 minutos, online ou presenciais, para adultos. Atendimento particular, sem convênio, com recibo para reembolso. Adolescentes: caso a caso, com agendamento por um responsável.",
            image: { src: "/servicos/autoconhecimento.jpg", alt: "Ilustração com ícones de cérebro, coração, flor e duas pessoas conversando em um sofá", width: 1024, height: 1024, caption: "Ilustração: pensamentos, emoções e relações." },
        },
        strip: [NAME_STRIP, "Análise do Comportamento", "Online e presencial", "Sessões guiadas"],
        when: {
            eyebrow: "Quando procurar",
            title: "“Sempre quis tentar terapia, mas não sei se tenho motivo”",
            intro: "Muitas pessoas têm questões a tratar, mas sentem dificuldade de nomeá-las com exatidão. Isso já é um bom ponto de partida.",
            groups: [
                { title: "Difícil de nomear", text: "Quando há um incômodo, mas falta explicação.", items: ["Sensação de estar no automático", "Angústia sem causa clara", "Dificuldade de dizer o que sente"] },
                { title: "Padrões que se repetem", text: "Quando as mesmas situações voltam em lugares diferentes.", items: ["Nas relações", "No trabalho", "Nas escolhas do dia a dia"] },
                { title: "Vontade de se conhecer", text: "Quando não há crise, e sim curiosidade e cuidado.", items: ["Entender seus valores", "Cuidar da saúde mental", "Decidir com mais clareza"] },
            ],
        },
        bodyImage: { src: "/servicos/processo-terapeutico.jpg", alt: "Ilustração suave de duas poltronas cercadas por ícones de escuta, tempo e cuidado", width: 1024, height: 1024, caption: "Ilustração: o processo terapêutico." },
        research: {
            eyebrow: "O que a pesquisa mostra",
            title: "Terapia também é para quem não está em crise",
            findings: [
                { text: "Uma meta-análise de 419 ensaios, com 53.288 pessoas com e sem diagnóstico, encontrou efeito de intervenções psicológicas sobre o bem-estar, incluindo as baseadas em terapia cognitivo-comportamental e em aceitação e compromisso.", refs: [1] },
                { text: "Uma revisão sobre jovens apontou a dificuldade de reconhecer os próprios sintomas como uma das principais barreiras para buscar ajuda. Não saber nomear é comum, e não impede de começar.", refs: [2] },
                { text: "Em 295 estudos, uma boa relação entre paciente e terapeuta esteve associada a melhores resultados. A primeira conversa também serve para ver se você se sente à vontade.", refs: [3] },
            ],
            caveat: "Na meta-análise sobre bem-estar, os efeitos foram moderados, no máximo, e a qualidade da evidência foi de baixa a moderada. Os resultados variam de pessoa para pessoa.",
        },
        steps: {
            eyebrow: "Como funciona",
            title: "Você não precisa saber por onde começar",
            items: [
                { title: "Primeira conversa", text: "Vocês falam sobre o que trouxe você até aqui, mesmo que ainda esteja confuso." },
                { title: "Sessões guiadas", text: "João conduz a conversa. Se for difícil falar, atividades ajudam o assunto a surgir." },
                { title: "Dar nome e entender", text: "Aos poucos, vocês olham para padrões da sua história e da sua rotina." },
                { title: "Escolher", text: "Com mais clareza, você decide o que quer manter e o que quer mudar." },
            ],
        },
        about: { eyebrow: "Quem conduz", title: "João Vitor Fernandes", text: `${WHO}, ${FORMATION}. ${PLACE}`, image: JV_STANDING },
        faq: [
            { question: "Tá, mas eu chego na sessão e falo o quê?", answer: "A sessão é guiada, e fazer o processo fluir é parte do trabalho de João. Se for difícil nomear algo, ou se não houver nada específico para falar, atividades ajudam o assunto a surgir." },
            { question: "Preciso ter um problema para fazer terapia?", answer: "Não. Você pode começar para se conhecer melhor e cuidar da sua qualidade de vida." },
            { question: "O terapeuta vai ficar em silêncio?", answer: "Não. João participa ativamente da conversa, faz perguntas e propõe atividades quando isso ajuda." },
            { question: "É online ou presencial?", answer: "Como você preferir: por videochamada ou no consultório na Vila Madalena." },
            FAQ_CONVENIO,
            FAQ_VALOR,
            FAQ_AGENDAR,
        ],
        closing: { eyebrow: "Quando fizer sentido", title: "Dar nome ao que se sente pode ser um primeiro passo.", cta: "Agendar uma conversa", note: "Particular, sem convênio · recibo para reembolso · sessões de cerca de 50 minutos · menores de 18 anos: contato por um responsável." },
        references: [
            { n: 1, text: REF.vanAgteren, doi: "10.1038/s41562-021-01093-w" },
            { n: 2, text: REF.gulliver, doi: "10.1186/1471-244X-10-113" },
            { n: 3, text: REF.fluckiger, doi: "10.1037/pst0000172" },
        ],
    },

    supervisao: {
        ...COMMON,
        theme: "slate_dark",
        hero: {
            badge: "Supervisão Clínica",
            title: "Supervisão clínica para psicólogos",
            subtitle: "Discussão de casos em Análise do Comportamento, com leitura científica e atenção à ética, para psicólogas e psicólogos que atendem em clínica.",
            cta: "Solicitar informações sobre a supervisão",
            note: "Encontros semanais, online ou presenciais. Valores pelo WhatsApp.",
            image: { src: "/servicos/acompanhamento.jpg", alt: "Ilustração de um treinador orientando um corredor em uma pista", width: 1408, height: 768, caption: "Ilustração: acompanhamento técnico ao longo do caminho." },
        },
        strip: [NAME_STRIP, "Análise do Comportamento", "Discussão de casos", "Ética profissional"],
        when: {
            eyebrow: "Para quem é",
            title: "Para quem atua na clínica e quer discutir seus casos",
            intro: "Não é necessária formação em uma universidade específica, e não há seleção por tempo de formado.",
            groups: [
                { title: "Quem pode participar", text: "O importante é atuar na área e compartilhar a abordagem.", items: ["Psicólogas e psicólogos clínicos", "Atuação em Análise do Comportamento", "Recém-formados ou com longa experiência"] },
                { title: "O que é trabalhado", text: "O conteúdo parte dos casos de consultório.", items: ["Manejo de casos", "Questões éticas", "Aprimoramento técnico"] },
                { title: "O que é esperado", text: "A supervisão pede tempo e dedicação.", items: ["Encontros semanais, no mínimo 1 vez por semana", "Algumas horas de estudo por semana", "Leitura de artigos e capítulos"] },
            ],
        },
        research: {
            eyebrow: "O que a pesquisa mostra",
            title: "O que se sabe, e o que ainda não se sabe, sobre supervisão",
            findings: [
                { text: "Uma revisão sistemática sobre supervisão em terapia cognitivo-comportamental incluiu 5 estudos e encontrou indícios de benefício para a competência de terapeutas iniciantes, com fragilidades metodológicas.", refs: [1] },
                { text: "Nessa revisão, nenhum estudo mostrou benefício direto para os pacientes. O efeito da supervisão nos resultados clínicos segue em aberto.", refs: [1] },
                { text: "Um estudo piloto de caso único, com 6 terapeutas, observou aumento da competência avaliada por terceiros durante a fase com supervisão, que focava competências específicas.", refs: [2] },
            ],
            caveat: "A evidência é pequena e vem principalmente da terapia cognitivo-comportamental. Por isso, a leitura crítica da literatura faz parte da supervisão.",
        },
        steps: {
            eyebrow: "Como funciona",
            title: "Como a supervisão acontece",
            items: [
                { title: "Contato", text: "Você fala sobre sua atuação e recebe as informações e o orçamento pelo WhatsApp." },
                { title: "Encontros semanais", text: "Discussão dos seus casos de consultório, no mínimo uma vez por semana." },
                { title: "Estudo dirigido", text: "Atividades conforme o caso discutido, muitas vezes com artigos científicos e capítulos de livros." },
            ],
        },
        about: { eyebrow: "Quem supervisiona", title: "João Vitor Fernandes", text: `${WHO}, ${FORMATION}. Trabalha com Análise do Comportamento.`, image: JV },
        faq: [
            { question: "Preciso ter alguma exigência específica?", answer: "É preciso ter disponibilidade para os encontros semanais e para algumas horas de estudo por semana, atuar na área clínica e trabalhar na mesma abordagem teórico-prática." },
            { question: "Sou recém-formado(a). Posso participar?", answer: "Sim. Não há critério de seleção por tempo de formado nem por universidade." },
            { question: "Trabalho com outra abordagem. Posso participar?", answer: "A supervisão é voltada a quem atua com Análise do Comportamento Humano." },
            { question: "Quais são os valores?", answer: "O orçamento é feito diretamente com João, pelo WhatsApp." },
        ],
        closing: { eyebrow: "Para colegas", title: "Traga seus casos para a discussão.", cta: "Solicitar informações sobre a supervisão" },
        references: [
            { n: 1, text: REF.alfonsson18, doi: "10.1080/16506073.2017.1369559" },
            { n: 2, text: REF.alfonsson20, doi: "10.1080/16506073.2020.1737571" },
        ],
    },

    lgbtqia: {
        ...COMMON,
        theme: "violet",
        hero: {
            badge: "Psicólogo LGBTQIA+",
            title: "Psicólogo LGBTQIA+",
            subtitle: "Você merece um espaço que te receba inteiro/a/e.",
            cta: "Agendar uma conversa",
            note: "João é psicólogo gay. Atendimento afirmativo, online ou presencial, para adultos. Particular, sem convênio, com recibo para reembolso. Menores de 18 anos: contato por um responsável.",
            image: JV_STANDING,
        },
        strip: [NAME_STRIP, "Atendimento afirmativo", "Sigilo profissional", "Online e presencial"],
        when: {
            eyebrow: "Quando procurar",
            title: "Você não precisa explicar quem você é antes de falar do que importa",
            intro: "O trabalho pode começar pelo que está causando sofrimento e pelo que você quer construir.",
            groups: [
                { title: "Identidade e aceitação", text: "A dificuldade de se aceitar costuma vir de anos de mensagens externas.", items: ["Sair do armário", "Autoaceitação", "Culpa e vergonha"] },
                { title: "Família e relações", text: "Relações que pesam e relações que você quer construir.", items: ["Família que ainda não entendeu", "Relacionamentos", "Amizades e rede de apoio"] },
                { title: "O peso do dia a dia", text: "O cansaço de existir em espaços que não foram feitos para você.", items: ["Preconceito e discriminação", "Ansiedade e depressão", "Medo de julgamento"] },
            ],
        },
        research: {
            eyebrow: "O que a pesquisa mostra",
            title: "O sofrimento tem contexto",
            findings: [
                { text: "O modelo do estresse de minoria descreve como estigma, preconceito e discriminação criam um ambiente hostil, que ajuda a explicar a maior prevalência de transtornos mentais em pessoas lésbicas, gays e bissexuais. Ele inclui a expectativa de rejeição, a necessidade de esconder quem se é e a homofobia internalizada.", refs: [1] },
                { text: "Em um ensaio com 63 homens gays e bissexuais jovens, uma terapia cognitivo-comportamental afirmativa reduziu sintomas de depressão e problemas com álcool em comparação com a lista de espera.", refs: [2] },
                { text: "Uma revisão de 144 estudos mostrou que o estigma afasta as pessoas do cuidado, e que o medo de se expor é a barreira mais citada entre as ligadas ao estigma. Um espaço sem julgamento começa por aí.", refs: [3] },
            ],
            caveat: "O ensaio foi pequeno e seus resultados são preliminares. No Brasil, as Resoluções CFP 01/1999 e 01/2018 orientam a Psicologia a não tratar orientação sexual, identidade de gênero ou transexualidade como doença.",
        },
        steps: {
            eyebrow: "Como funciona",
            title: "No seu ritmo",
            items: [
                { title: "Primeira conversa", text: "Você pode chegar como quiser e falar no ritmo que precisar." },
                { title: "Entender o que foi ensinado", text: "Vocês olham para o que você aprendeu a sentir sobre si, sem dizer quem você deve ser." },
                { title: "Construir", text: "Com base científica, vocês trabalham uma relação mais leve com quem você é e com os outros." },
            ],
        },
        about: { eyebrow: "Quem atende", title: "João Vitor Fernandes", text: `${WHO}, ${FORMATION}. João é gay e atende pessoas LGBTQIA+ de forma afirmativa. ${PLACE}`, image: OFFICE },
        faq: [
            { question: "Por que procurar um psicólogo LGBTQIA+?", answer: "Porque é possível falar de sair do armário, do peso de uma família que ainda não entendeu ou do cansaço de certos espaços com um psicólogo que conhece esse contexto. O trabalho parte do que importa para você." },
            { question: "Sinto que preciso me aceitar, mas não sei por onde começar. E agora?", answer: "Essa é uma das coisas mais honestas que alguém pode trazer para a terapia. A terapia não vai dizer quem você deve ser. Ela ajuda a entender o que te ensinaram a sentir sobre si e a construir uma relação mais leve com quem você é. Isso leva tempo." },
            { question: "Tenho medo de julgamento. Como é aqui?", answer: "É um medo legítimo. Aqui não há julgamento sobre sua identidade, sua orientação, seus relacionamentos ou suas escolhas. Você pode ocupar esse espaço sem se explicar antes de se sentir seguro/a/e." },
            { question: "O que eu falar fica em sigilo?", answer: "Sim. O sigilo é um dever profissional do psicólogo. As únicas exceções são as previstas em lei e no Código de Ética, e João explica como isso funciona na primeira conversa." },
            { question: "É online ou presencial?", answer: "Como você preferir: por videochamada ou no consultório na Vila Madalena." },
            FAQ_CONVENIO,
            FAQ_VALOR,
            FAQ_AGENDAR,
        ],
        closing: { eyebrow: "Quando fizer sentido", title: "Aqui, você pode chegar como é.", cta: "Agendar uma conversa", note: "Particular, sem convênio · recibo para reembolso · online ou presencial · menores de 18 anos: contato por um responsável." },
        references: [
            { n: 1, text: REF.meyer, doi: "10.1037/0033-2909.129.5.674" },
            { n: 2, text: REF.pachankis, doi: "10.1037/ccp0000037" },
            { n: 3, text: REF.clement, doi: "10.1017/S0033291714000129" },
        ],
    },
};
