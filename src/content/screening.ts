// Self-report screening questionnaires (public-domain instruments). The scoring runs in the browser only.
// Item wording follows the Portuguese versions distributed free of charge by the authors; João should review it.

export const FREQUENCY = [
    { value: 0, label: "Nenhuma vez" },
    { value: 1, label: "Vários dias" },
    { value: 2, label: "Mais da metade dos dias" },
    { value: 3, label: "Quase todos os dias" },
] as const;

export type Screening = {
    slug: "phq-9" | "gad-7";
    name: string;
    title: string;
    description: string;
    intro: string;
    items: string[];
    /** Index (0-based) of the item that flags thoughts of self-harm, if any. */
    safetyItem?: number;
    bands: { max: number; label: string; note: string }[];
    sources: string[];
};

export const PHQ9: Screening = {
    slug: "phq-9",
    name: "PHQ-9",
    title: "Questionário de rastreio de sintomas depressivos (PHQ-9)",
    description: "Questionário de 9 perguntas para rastrear sintomas depressivos nas últimas duas semanas. O resultado é calculado no seu navegador e não é guardado nem enviado.",
    intro: "Nas últimas 2 semanas, com que frequência você foi incomodado(a) por qualquer um dos problemas abaixo?",
    items: [
        "Pouco interesse ou pouco prazer em fazer as coisas",
        "Se sentir “para baixo”, deprimido(a) ou sem perspectiva",
        "Dificuldade para pegar no sono ou permanecer dormindo, ou dormir mais do que o costume",
        "Se sentir cansado(a) ou com pouca energia",
        "Falta de apetite ou comendo demais",
        "Se sentir mal consigo mesmo(a), ou achar que você é um fracasso ou que decepcionou sua família ou você mesmo(a)",
        "Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão",
        "Lentidão para se movimentar ou falar, a ponto de outras pessoas perceberem; ou o oposto, estar tão agitado(a) ou irrequieto(a) que você fica andando de um lado para o outro muito mais do que de costume",
        "Pensar em se machucar de alguma maneira ou que seria melhor estar morto(a)",
    ],
    safetyItem: 8,
    bands: [
        { max: 4, label: "Sintomas mínimos", note: "As respostas indicam poucos ou nenhum sintoma depressivo nas últimas duas semanas." },
        { max: 9, label: "Sintomas leves", note: "As respostas indicam sintomas leves. Vale observar como eles evoluem e conversar com alguém de confiança ou um profissional." },
        { max: 14, label: "Sintomas moderados", note: "As respostas indicam sintomas moderados. Uma avaliação com um profissional de saúde mental é recomendada." },
        { max: 19, label: "Sintomas moderadamente graves", note: "As respostas indicam sintomas importantes. Procure uma avaliação com um profissional de saúde mental em breve." },
        { max: 27, label: "Sintomas graves", note: "As respostas indicam sintomas intensos. Procure um profissional de saúde mental o quanto antes." },
    ],
    sources: [
        "Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606-613.",
        "Santos IS, Tavares BF, Munhoz TN, et al. Sensibilidade e especificidade do Patient Health Questionnaire-9 (PHQ-9) entre adultos da população geral. Cad Saúde Pública. 2013;29(8):1533-1543.",
    ],
};

export const GAD7: Screening = {
    slug: "gad-7",
    name: "GAD-7",
    title: "Questionário de rastreio de sintomas de ansiedade (GAD-7)",
    description: "Questionário de 7 perguntas para rastrear sintomas de ansiedade nas últimas duas semanas. O resultado é calculado no seu navegador e não é guardado nem enviado.",
    intro: "Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos problemas abaixo?",
    items: [
        "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)",
        "Não ser capaz de impedir ou de controlar as preocupações",
        "Preocupar-se muito com diversas coisas",
        "Dificuldade para relaxar",
        "Ficar tão agitado(a) que se torna difícil permanecer sentado(a)",
        "Ficar facilmente aborrecido(a) ou irritado(a)",
        "Sentir medo como se algo horrível fosse acontecer",
    ],
    bands: [
        { max: 4, label: "Sintomas mínimos", note: "As respostas indicam poucos ou nenhum sintoma de ansiedade nas últimas duas semanas." },
        { max: 9, label: "Sintomas leves", note: "As respostas indicam sintomas leves de ansiedade. Vale observar como eles evoluem e conversar com um profissional se incomodarem." },
        { max: 14, label: "Sintomas moderados", note: "As respostas indicam sintomas moderados. Uma avaliação com um profissional de saúde mental é recomendada." },
        { max: 21, label: "Sintomas graves", note: "As respostas indicam sintomas intensos de ansiedade. Procure um profissional de saúde mental o quanto antes." },
    ],
    sources: [
        "Spitzer RL, Kroenke K, Williams JBW, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092-1097.",
        "Moreno AL, DeSousa DA, Souza AMFLP, et al. Factor structure, reliability, and item parameters of the Brazilian-Portuguese version of the GAD-7 questionnaire. Temas em Psicologia. 2016;24(1):367-376.",
    ],
};

export const SCREENINGS = { "phq-9": PHQ9, "gad-7": GAD7 } as const;
