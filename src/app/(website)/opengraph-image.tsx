import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Psicólogo João Fernandes — Análise do Comportamento";

export default function Image() {
    return renderOgCard({
        eyebrow: "Psicólogo clínico",
        title: "Terapia baseada em ciência do comportamento",
        portrait: true,
    });
}
