import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FloatingCatButton } from "@/components/floating-cat-button";
import { GclidCapture } from "@/components/GclidCapture";
import { siteConfig } from "@/lib/config";
import { person } from "@/content/clinic";
import { SITE_NAME } from "@/lib/seo";
import { siteGraph } from "@/lib/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    metadataBase: new URL(siteConfig.url),

    title: {
        default: "Psicólogo João Fernandes | Terapia Comportamental Online e Presencial",
        template: `%s | ${SITE_NAME}`,
    },

    description: "Psicólogo particular, LGBT+ e especialista em Análise do Comportamento (PUCSP). Psicoterapia online para todo o Brasil ou presencial na Vila Madalena, SP. Agende sua sessão.",

    applicationName: SITE_NAME,
    authors: [{ name: person.name, url: siteConfig.url }],
    creator: person.name,
    publisher: person.name,
    category: "health",

    keywords: [
        "psicólogo online",
        "agendar psicólogo online",
        "psicólogo particular online",
        "terapia comportamental",
        "análise do comportamento",
        "behaviorismo radical",
        "psicólogo vila madalena",
        "psicólogo comportamental sp",
        "psicoterapia individual particular",
        "joão vitor fernandes psicólogo",
        "psicólogo LGBT online",
        "psicólogo gay online",
        "atendimento lgbtq psicólogo"
    ],

    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: "/",
        siteName: SITE_NAME,
        title: "Psicólogo João Fernandes | Terapia Comportamental",
        description: "Psicoterapia baseada em evidências. Atendimento online para todo o Brasil e presencial na Vila Madalena, SP.",
    },

    twitter: {
        card: "summary_large_image",
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

    // No canonical here: it would be inherited by every page and point
    // them all at the homepage. Each page sets its own via buildMetadata.
    alternates: {
        types: {
            "application/rss+xml": [{ url: "/feed.xml", title: "Blog do Psicólogo João Fernandes" }],
        },
    },

    formatDetection: { telephone: false },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const gaId = process.env.NEXT_PUBLIC_GA_ID

    return (
        <html lang="pt-BR" className={inter.variable}>
            <body className={`${inter.className} antialiased`}>
                <JsonLd data={siteGraph()} />

                <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-background text-foreground rounded-md shadow-md border border-border">
                    Pular para o conteúdo principal
                </a>

                <main id="main-content">
                    {children}
                </main>

                <GclidCapture />
                <FloatingCatButton />
                {gaId && <GoogleAnalytics gaId={gaId} />}
            </body>
        </html>
    );
}