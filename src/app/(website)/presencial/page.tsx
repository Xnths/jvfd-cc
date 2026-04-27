import type { Metadata } from "next";
import Script from "next/script";
import { HeroPresencial } from "@/components/presencial/HeroPresencial";
import { SobreJoao } from "@/components/presencial/SobreJoao";
import { CardsSolucao } from "@/components/presencial/CardsSolucao";
import { ComoChegar } from "@/components/presencial/ComoChegar";
import { CTAPresencial } from "@/components/presencial/CTAPresencial";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Psicólogo Presencial em Vila Madelena | João Fernandes",
  description:
    "Atendimento psicológico presencial em Sumarezinho, Vila Madelena. Foco em equilíbrio emocional, autoconhecimento e desenvolvimento pessoal.",
  alternates: {
    canonical: "https://psicologojoaofernandes.com/presencial",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "João Fernandes Psicólogo",
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
  url: "https://psicologojoaofernandes.com/presencial",
  telephone: "+5511955591996",
};

export default function PresencialPage() {
  return (
    <div className="min-h-screen">
      <Script
        id="json-ld-presencial"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroPresencial />
      <SobreJoao />
      <CardsSolucao />
      <ComoChegar />
      <CTAPresencial />
      <Footer />
    </div>
  );
}
