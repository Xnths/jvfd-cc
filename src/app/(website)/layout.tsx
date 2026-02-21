import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { FloatingCatButton } from "@/components/floating-cat-button";
import { siteConfig } from "@/lib/config";
import { GoogleAnalytics } from '@next/third-parties/google'

export const metadata: Metadata = {
    metadataBase: new URL(siteConfig.url),

    title: {
        default: "Psicólogo João Fernandes | Terapia Comportamental Online e Presencial",
        template: `%s | Psicólogo João Fernandes`,
    },

    description: "Psicólogo Particular e Especialista em Análise do Comportamento (PUCSP). Psicoterapia online para todo o Brasil ou presencial na Vila Madalena, SP. Agende sua sessão.",

    keywords: [
        "psicólogo online",
        "agendar psicólogo online",
        "psicólogo particular online",
        "terapia comportamental",
        "análise do comportamento",
        "psicólogo vila madalena",
        "psicólogo comportamental sp",
        "psicoterapia individual particular",
        "joão vitor fernandes psicólogo"
    ],

    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: siteConfig.url,
        siteName: "Consultório de Psicologia João Fernandes",
        title: "Psicólogo João Fernandes | Terapia Comportamental",
        description: "Psicoterapia baseada em evidências. Atendimento Online para todo o Brasil e Presencial na Vila Madalena, SP.",
        images: [
            {
                url: siteConfig.ogImage,
                width: 1200,
                height: 630,
                alt: "Consultório do Psicólogo João Fernandes na Vila Madalena",
            },
        ],
    },

    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },

    alternates: {
        canonical: siteConfig.url,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const gaId = process.env.NEXT_PUBLIC_GA_ID

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Psychologist",
        "name": "Psicólogo João Fernandes",
        "image": siteConfig.ogImage,
        "url": siteConfig.url,
        "telephone": siteConfig.contact.phone,
        "priceRange": "$$$",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Rua Harmonia, 1323",
            "addressLocality": "São Paulo",
            "addressRegion": "SP",
            "postalCode": "05435-001",
            "addressCountry": "BR"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": -23.5531,
            "longitude": -46.6868
        },
        "openingHoursSpecification": [
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "opens": "08:00",
                "closes": "21:00"
            }
        ],
        "sameAs": [
            siteConfig.links.instagram,
        ],
        "medicalSpecialty": [
            "Psychology",
            "Behavioral Analysis"
        ],
        "knowsAbout": [
            { "@type": "Thing", "name": "Psicoterapia" },
            { "@type": "Thing", "name": "Bem-estar Emocional" },
            { "@type": "Thing", "name": "Terapia Comportamental" },
            { "@type": "Thing", "name": "Gestão de Emoções" },
            { "@type": "Thing", "name": "Desenvolvimento Pessoal" }
        ],
        "availableService": [
            {
                "@type": "MedicalTherapy",
                "name": "Psicoterapia Individual",
                "description": "Espaço de escuta ativa e sem julgamentos para compreender padrões de sofrimento e construir novas formas de lidar com emoções."
            },
            {
                "@type": "MedicalTherapy",
                "name": "Terapia para Foco e Organização",
                "description": "Desenvolvimento de estratégias práticas e personalizadas para melhorar o foco e a gestão de tempo."
            },
            {
                "@type": "MedicalTherapy",
                "name": "Plantão Psicológico e Acolhimento",
                "description": "Suporte para estabilizar emoções em momentos de grande angústia, como perdas significativas ou separações."
            },
            {
                "@type": "MedicalTherapy",
                "name": "Terapia de Casal",
                "description": "Atendimento focado em melhorar a comunicação, estabelecer limites saudáveis e entender a dinâmica dos relacionamentos."
            },
            {
                "@type": "MedicalTherapy",
                "name": "Avaliação Psicológica e Autoconhecimento",
                "description": "Processo focado em dar nome e sentido para angústias e sentimentos complexos."
            },
            {
                "@type": "MedicalTherapy",
                "name": "Supervisão Clínica para Psicólogos",
                "description": "Supervisão em Análise do Comportamento focada em discussão de casos, ética e aprimoramento técnico."
            }
        ]
    };

    return (
        <html lang="pt-BR">
            <body className="antialiased">
                <Script
                    id="json-ld-psychologist"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />

                <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-background text-foreground rounded-md shadow-md border border-border">
                    Pular para o conteúdo principal
                </a>

                <main id="main-content">
                    {children}
                </main>

                <FloatingCatButton />
                {gaId && <GoogleAnalytics gaId={gaId} />}
            </body>
        </html>
    );
}