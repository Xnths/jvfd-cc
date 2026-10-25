import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { getTreatmentBySlug } from "@/lib/queries";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Atendimento com o Psicólogo João Fernandes";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const t = await getTreatmentBySlug(slug).catch(() => null);
    return renderOgCard({ eyebrow: "Atendimento", title: t?.title ?? "Psicólogo João Fernandes" });
}
