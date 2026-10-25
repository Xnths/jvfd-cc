import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { getPostBySlug } from "@/lib/queries";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Artigo do blog do Psicólogo João Fernandes";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPostBySlug(slug).catch(() => null);
    return renderOgCard({ eyebrow: "Blog", title: post?.title ?? "Blog do Psicólogo João Fernandes" });
}
