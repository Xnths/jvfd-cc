import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { FloatingCatButton } from "@/components/floating-cat-button";

export const metadata: Metadata = {
    metadataBase: new URL("https://dev.xnths.com"),

    title: {
        default:
            "Psicólogo Analítico-Comportamental | Vila Madalena, SP - João Vitor Fernandes",
        template: "%s | João Vitor Fernandes – Psicólogo",
    },

    description:
        "Psicólogo Analítico-Comportamental com atendimento online e presencial na Vila Madalena, SP. Psicologia baseada em evidências.",

    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: "https://dev.xnths.com",
        siteName: "João Vitor Fernandes | Psicologia",

        title: "Psicólogo Analítico-Comportamental | Vila Madalena, SP",
        description:
            "Atendimento psicológico baseado em evidências na Vila Madalena, São Paulo.",

        images: [
            {
                url: "https://dev.xnths.com/main.jpeg",
                width: 1200,
                height: 630,
                alt: "João Vitor Fernandes – Psicólogo Analítico-Comportamental",
            },
        ],
    },

    twitter: {
        card: "summary_large_image",
        title: "Psicólogo Analítico-Comportamental | Vila Madalena, SP",
        description:
            "Psicologia baseada em evidências, atendimento presencial e online.",
        images: ["https://dev.xnths.com/main.jpeg"],
    },

    alternates: {
        canonical: "https://dev.xnths.com",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <head>
                <link rel="icon" href="/favicon.ico" />

                <Script
                    id="json-ld-psychologist"
                    type="application/ld+json"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "MedicalOrganization",
                            name: "João Vitor Fernandes - Psicólogo Analítico-Comportamental",
                            description:
                                "Psicólogo Analítico-Comportamental em Vila Madalena, SP. Atendimento baseado em evidências para manejo de contingências e regulação comportamental.",
                            image: "https://seudominiooficial.com.br/jv.jpeg",
                            url: "https://seudominiooficial.com.br/",
                            telephone: "+5511955591996",
                            priceRange: "R$ 400,00",
                            address: {
                                "@type": "PostalAddress",
                                streetAddress: "Rua Harmonia, 1323",
                                addressLocality: "São Paulo",
                                addressRegion: "SP",
                                postalCode: "05435-001",
                                addressCountry: "BR",
                            },
                            geo: {
                                "@type": "GeoCoordinates",
                                latitude: -23.55396,
                                longitude: -46.69175,
                            },
                            openingHoursSpecification: [
                                {
                                    "@type": "OpeningHoursSpecification",
                                    dayOfWeek: [
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                    ],
                                    opens: "08:00",
                                    closes: "22:00",
                                },
                            ],
                            sameAs: [
                                "https://www.instagram.com/ciencia_comportamental_/",
                            ],
                            medicalSpecialty: [
                                "Psychology",
                                "Behavioral Analysis",
                            ],
                            availableService: [
                                {
                                    "@type": "MedicalTherapy",
                                    name: "Psicoterapia Individual (Análise do Comportamento)",
                                },
                                {
                                    "@type": "MedicalTherapy",
                                    name: "Supervisão Clínica",
                                },
                                {
                                    "@type": "MedicalTherapy",
                                    name: "Acompanhamento Terapêutico",
                                },
                            ],
                            knowsAbout: [
                                "Behaviorismo Radical",
                                "Análise Funcional",
                                "Psicologia Baseada em Evidências",
                            ],
                        }),
                    }}
                />
            </head>

            <body>
                {children}
                <FloatingCatButton />
            </body>
        </html>
    );
}
