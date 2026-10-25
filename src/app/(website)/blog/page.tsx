import type { Metadata } from "next";
import { BlogList } from "@/components/BlogList";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublishedPosts } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { blogNode, breadcrumbNode, graph } from "@/lib/jsonld";

// Can't be prerendered at build time (no database in the Docker build), so it
// renders per request from the tag-invalidated query cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
    title: "Blog",
    description:
        "Artigos sobre psicologia, Análise do Comportamento e saúde mental, escritos pelo psicólogo João Fernandes (CRP 06/157908).",
    path: "/blog",
});

export default async function BlogPage() {
    const posts = await getPublishedPosts();

    // Prepare serializable posts for client component
    const serializablePosts = posts.map(post => ({
        id: String(post.id),
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        publishedDate: new Date(post.publishedDate).toISOString()
    }));

    return (
        <div className="container mx-auto px-4 py-20 min-h-screen">
            <JsonLd data={graph(blogNode(posts), breadcrumbNode([{ name: "Blog", path: "/blog" }]))} />
            <BlogList posts={serializablePosts} />
        </div>
    );
}
