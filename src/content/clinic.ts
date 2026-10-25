// Single source of truth for facts about João and the clinic.
// Plain module (no "use client") so server routes — JSON-LD, llms.txt,
// markdown exports — can read the same data the UI renders.

export const SITE_URL = "https://psicologojoaofernandes.com";

export const person = {
    name: "João Vitor Fernandes Domingues",
    shortName: "João Fernandes",
    jobTitle: "Psicólogo clínico",
    crp: "06/157908",
    practicingSince: 2019,
    approach: "Análise do Comportamento (Behaviorismo Radical)",
    image: `${SITE_URL}/jv.jpeg`,
    languages: ["pt-BR"],
    knowsAbout: [
        "Análise do Comportamento",
        "Behaviorismo Radical",
        "Psicoterapia",
        "Terapia comportamental",
        "Psicologia LGBTQIA+",
        "Neuropsicologia",
        "Psicologia hospitalar",
        "Supervisão clínica",
        "Biologia do comportamento",
        "Química para vestibular",
        "Métodos de estudo",
    ],
} as const;

export const contact = {
    phone: "+5511955591996",
    phoneDisplay: "+55 (11) 95559-1996",
    whatsappNumber: "5511955591996",
    email: "joao@psicologojoaofernandes.com",
    address: {
        street: "Rua Harmonia, 1323",
        neighborhood: "Sumarezinho — Vila Madalena",
        locality: "São Paulo",
        region: "SP",
        postalCode: "05435-001",
        country: "BR",
    },
    geo: {
        latitude: -23.55396,
        longitude: -46.69175,
    },
    hours: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        daysLabel: "Segunda a sexta",
        opens: "08:00",
        closes: "21:00",
    },
    mapEmbedUrl:
        "https://www.google.com/maps?q=Rua+Harmonia,+1323+-+Vila+Madalena,+S%C3%A3o+Paulo+-+SP,+05435-001&output=embed",
    mapUrl: "https://share.google/hlX9ww5FwJDc0ggp3",
} as const;

export const links = {
    instagram: "https://www.instagram.com/ciencia_comportamental_/",
    instagramHandle: "@ciencia_comportamental_",
    linkedin: "https://www.linkedin.com/in/psicologo-joao-fernandes-d/",
    lattes: "https://lattes.cnpq.br/2507330776380191",
    oneliv: "https://oneliv.com.br/profissional/joao-vitor-fernandes-domingues",
    googleProfile: "https://share.google/hlX9ww5FwJDc0ggp3",
    googleKnowledgeGraph: "https://www.google.com/search?kgmid=/g/11y_vzfhl_",
} as const;

export const sameAs = [
    links.instagram,
    links.linkedin,
    links.lattes,
    links.oneliv,
    links.googleKnowledgeGraph,
];

export const qualifications = [
    {
        key: "graduacao",
        title: "Bacharelado em Psicologia",
        institution: "Pontifícia Universidade Católica de São Paulo (PUCSP)",
    },
    {
        key: "hospitalar",
        title: "Aperfeiçoamento em Psicologia Hospitalar",
        institution: "Psicocare",
    },
    {
        key: "neuropsicologia",
        title: "Pós-graduação em Neuropsicologia",
        institution: "Hospital Israelita Albert Einstein",
    },
    {
        key: "neurociencias",
        title: "Pós-graduação em Neurociências, Comportamento e Psicopatologia",
        institution: "Pontifícia Universidade Católica do Paraná (PUCPR)",
    },
    {
        key: "filosofia",
        title: "Curso em Filosofia Oriental",
        institution: "Universidade Harvard",
    },
] as const;

export const alumniOf = [
    "Pontifícia Universidade Católica de São Paulo",
    "Hospital Israelita Albert Einstein",
    "Pontifícia Universidade Católica do Paraná",
];

export type Service = {
    title: string;
    description: string;
    href: string;
    /** Short name used in structured data, llms.txt and navigation */
    name: string;
    pride?: boolean;
};

export const services: Service[] = [
    {
        name: "Psicoterapia individual",
        title: "Quando lidar sozinho já não está funcionando",
        description:
            "A psicoterapia oferece um espaço de escuta ativa e sem julgamentos. Juntos, vamos compreender padrões que trazem sofrimento e construir novas formas de lidar com suas emoções e desafios.",
        href: "/psicoterapia",
    },
    {
        name: "Foco e organização",
        title: "Dificuldade de concentração e organização",
        description:
            "Se a rotina parece caótica ou o rendimento caiu, podemos desenvolver estratégias práticas e personalizadas para melhorar seu foco e gestão de tempo, respeitando seu ritmo.",
        href: "/foco-organizacao",
    },
    {
        name: "Plantão psicológico",
        title: "Acolhimento imediato para momentos difíceis",
        description:
            "Em momentos de grande angústia — como perdas significativas, separações ou inquietações intensas — o mais importante é não passar por isso sozinho. Ofereço suporte para estabilizar suas emoções e encontrar segurança.",
        href: "/plantao",
    },
    {
        name: "Terapia de casal",
        title: "Conflitos nos relacionamentos",
        description:
            "Problemas com parceiros ou família são comuns, mas desgastantes. Vamos trabalhar para melhorar a comunicação, estabelecer limites saudáveis e entender a dinâmica dessas relações.",
        href: "/terapia-de-casal",
    },
    {
        name: "Autoconhecimento e avaliação psicológica",
        title: "Autoconhecimento e entendimento",
        description:
            "Muitas vezes, não sabemos explicar o que sentimos. A avaliação psicológica ajuda a dar nome e sentido para suas angústias, sendo o primeiro passo para a mudança.",
        href: "/autoconhecimento",
    },
    {
        name: "Supervisão clínica para psicólogos",
        title: "Supervisão para psicólogos",
        description:
            "Para colegas de profissão, ofereço supervisão clínica em Análise do Comportamento, focada em discussão de casos, ética e aprimoramento técnico em parceria.",
        href: "/supervisao",
    },
    {
        name: "Psicólogo LGBTQIA+",
        title: "Psicólogo LGBTQIA+",
        description:
            "João é psicólogo gay e traz empatia genuína para o atendimento da comunidade LGBTQIA+. Juntos, trabalhamos rumo à aceitação, a relacionamentos mais plenos e a uma vida com mais alegria e autenticidade.",
        href: "/lgbtqia",
        pride: true,
    },
];

export const faq = [
    {
        id: "item-2",
        question: "O atendimento é presencial ou online?",
        answer:
            "Como você preferir. O atendimento online acontece por videochamada segura, ideal para quem precisa de flexibilidade ou está longe. O presencial ocorre no consultório na Vila Madalena, SP. Ambos têm a mesma qualidade e eficácia.",
    },
    {
        id: "item-1",
        question: "Como funciona a primeira sessão?",
        answer:
            "É um momento para nos conhecermos, sem pressão. Você poderá me contar o que o trouxe à terapia, suas dúvidas e expectativas. Eu explicarei como trabalho e juntos definiremos os próximos passos.",
    },
    {
        id: "item-3",
        question: "Qual a duração da terapia?",
        answer:
            "Cada processo é único. As sessões duram cerca de 50 minutos e geralmente são semanais. A duração total do acompanhamento varia conforme seus objetivos e necessidades, tudo alinhado com transparência entre nós.",
    },
    {
        id: "item-4",
        question: "Aceita convênios?",
        answer:
            "O atendimento é particular, mas forneço recibos para reembolso no seu plano de saúde.",
    },
];

export const presencial = {
    transit: [
        {
            key: "metro",
            label: "Metrô",
            detail: "Estação Vila Madalena (Linha 2-Verde) — aproximadamente 4 min a pé",
        },
        {
            key: "onibus",
            label: "Ônibus",
            detail: "Linhas que param na Rua Heitor Penteado",
        },
        {
            key: "carro",
            label: "Carro",
            detail: "Não há estacionamento no local — recomenda-se ir de aplicativo (Uber, 99 etc.)",
        },
        {
            key: "acessibilidade",
            label: "Acessibilidade",
            detail: "Rampa de acesso e banheiro acessível",
        },
    ],
} as const;

export function whatsappLink(message: string) {
    return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function formatAddress() {
    const a = contact.address;
    return `${a.street} — ${a.neighborhood}, ${a.locality} - ${a.region}, ${a.postalCode}`;
}
