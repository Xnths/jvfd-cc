import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbNode, graph, webPageNode } from "@/lib/jsonld";
import { HeroPresencial } from "@/components/presencial/HeroPresencial";
import { SobreJoao } from "@/components/presencial/SobreJoao";
import { CardsSolucao } from "@/components/presencial/CardsSolucao";
import { ComoChegar } from "@/components/presencial/ComoChegar";
import { CTAPresencial } from "@/components/presencial/CTAPresencial";
import { Footer } from "@/components/Footer";

const description =
  "Atendimento psicológico presencial no Sumarezinho, Vila Madalena (SP), a 4 min do metrô Vila Madalena. Psicoterapia em Análise do Comportamento com João Fernandes, CRP 06/157908.";

export const metadata: Metadata = buildMetadata({
  absoluteTitle: "Psicólogo Presencial na Vila Madalena, SP | João Fernandes",
  description,
  path: "/presencial",
});

export default function PresencialPage() {
  return (
    <div className="min-h-screen">
      <JsonLd
        data={graph(
          webPageNode({ path: "/presencial", name: "Psicólogo presencial na Vila Madalena", description }),
          breadcrumbNode([{ name: "Atendimento presencial", path: "/presencial" }]),
        )}
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
