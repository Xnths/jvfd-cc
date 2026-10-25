// Aulas particulares — a separate, educational service (not psychotherapy).

export const tutoring = {
    path: "/aulas-particulares",
    name: "Aulas particulares com João Fernandes",
    shortName: "Aulas particulares",
    title: "Aulas particulares de Química, Biologia e método de estudo",
    metaTitle: "Aulas Particulares de Química para ENEM e Vestibular | Método de Estudo",
    description:
        "Aulas particulares de Química e Biologia para ENEM e vestibular, método de estudo baseado em Análise do Comportamento e aulas para estudantes de Psicologia. Online ou na Vila Madalena, SP.",
    eyebrow: "Aulas particulares",
    headline: "Aprender também é comportamento. E comportamento se aprende.",
    subheadline:
        "Aulas individuais de Química e Biologia para ENEM e vestibular, com um método de estudo construído a partir da Análise do Comportamento: metas pequenas, prática distribuída e progresso que você consegue ver.",
    whatsappMessage:
        "Olá, João! Vi o site e gostaria de saber mais sobre as aulas particulares.",
    tracks: [
        {
            key: "quimica",
            title: "Química para ENEM e vestibular",
            description:
                "Do básico à química orgânica, com foco no que mais cai no ENEM, FUVEST, UNICAMP e demais vestibulares. Conteúdo explicado com calma, exercícios graduados e revisão planejada.",
            topics: [
                "Química geral e inorgânica",
                "Estequiometria e soluções",
                "Físico-química",
                "Química orgânica",
                "Resolução comentada de provas anteriores",
            ],
        },
        {
            key: "biologia",
            title: "Biologia para ENEM e vestibular",
            description:
                "Biologia como ela é: um sistema conectado, da célula à evolução. Ênfase em compreender os processos — e não só decorar nomes — para responder às questões interpretativas do ENEM.",
            topics: [
                "Citologia e bioquímica",
                "Genética",
                "Evolução e ecologia",
                "Fisiologia humana",
            ],
        },
        {
            key: "metodo",
            title: "Método de estudo comportamental",
            description:
                "Para quem estuda muito e rende pouco, ou não consegue começar. Usamos princípios da Análise do Comportamento para montar uma rotina que funcione na prática.",
            topics: [
                "Rotina e metas de estudo realistas",
                "Prática distribuída e autotestagem",
                "Estratégias contra a procrastinação",
                "Registro de progresso e ajuste do plano",
            ],
        },
        {
            key: "psicologia",
            title: "Aulas para estudantes de Psicologia",
            description:
                "Apoio para graduandos e recém-formados que querem dominar a Análise do Comportamento: conceitos, leitura de textos clássicos e aplicação clínica.",
            topics: [
                "Behaviorismo Radical e conceitos básicos",
                "Análise funcional",
                "Leitura guiada de Skinner e autores contemporâneos",
                "Preparação para provas e TCC",
            ],
        },
    ],
    howItWorks: [
        {
            title: "Conversa inicial",
            description:
                "Entendemos seu objetivo (prova, matéria, prazo) e o ponto de partida.",
        },
        {
            title: "Plano sob medida",
            description:
                "Montamos um cronograma com metas semanais pequenas e alcançáveis.",
        },
        {
            title: "Aulas e prática",
            description:
                "Explicação, exercícios graduados e feedback imediato a cada etapa.",
        },
        {
            title: "Acompanhamento",
            description:
                "Registramos o progresso e ajustamos o plano conforme os resultados.",
        },
    ],
    faq: [
        {
            question: "As aulas são online ou presenciais?",
            answer:
                "As aulas podem ser online, por videochamada, ou presenciais no consultório da Vila Madalena, em São Paulo, conforme disponibilidade.",
        },
        {
            question: "Para quem são as aulas?",
            answer:
                "Para estudantes do ensino médio e de cursinho que vão prestar ENEM ou vestibulares, para quem quer aprender a estudar melhor e para estudantes de Psicologia interessados em Análise do Comportamento.",
        },
        {
            question: "As aulas são uma forma de terapia?",
            answer:
                "Não. As aulas são um serviço educacional, separado do atendimento psicológico. Por ética profissional, pacientes em psicoterapia com João não são atendidos também como alunos, e vice-versa.",
        },
    ],
} as const;
