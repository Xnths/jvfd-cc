import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { FloatingCatButton } from "@/components/floating-cat-button";
import AnalyticsInit from "@/components/analytics-init";

import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
    metadataBase: new URL(siteConfig.url),

    title: {
        default: siteConfig.name,
        template: `%s | ${siteConfig.name}`,
    },

    description: siteConfig.description,

    keywords: siteConfig.keywords,

    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: siteConfig.url,
        siteName: siteConfig.name,
        title: siteConfig.name,
        description: siteConfig.description,
        images: [
            {
                url: siteConfig.ogImage,
                width: 1200,
                height: 630,
                alt: siteConfig.name,
            },
        ],
    },

    twitter: {
        card: "summary_large_image",
        title: siteConfig.name,
        description: siteConfig.description,
        images: [siteConfig.ogImage],
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
                            name: siteConfig.name,
                            description: siteConfig.description,
                            image: siteConfig.ogImage,
                            url: siteConfig.url,
                            telephone: siteConfig.contact.phone,
                            priceRange: "R$ 400,00",
                            address: {
                                "@type": "PostalAddress",
                                streetAddress: siteConfig.contact.address.street,
                                addressLocality: siteConfig.contact.address.locality,
                                addressRegion: siteConfig.contact.address.region,
                                postalCode: siteConfig.contact.address.postalCode,
                                addressCountry: siteConfig.contact.address.country,
                            },
                            geo: {
                                "@type": "GeoCoordinates",
                                latitude: siteConfig.contact.geo.latitude,
                                longitude: siteConfig.contact.geo.longitude,
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
                                siteConfig.links.instagram,
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
                <AnalyticsInit />
            </body>
        </html>
    );
}
