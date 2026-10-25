import { renderOgCard } from "@/lib/og";

// Stable URL for the default social card. Pages that set their own
// `openGraph` replace the inherited file-based image, so they point here.
export async function GET() {
    const res = await renderOgCard({
        eyebrow: "Psicólogo clínico",
        title: "Terapia baseada em ciência do comportamento",
        portrait: true,
    });
    res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
    return res;
}
