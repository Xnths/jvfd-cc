import { getPayload } from "payload";
import configPromise from "@payload-config";
import { Metadata } from "next";
import { BlogList } from "@/components/BlogList";

export const metadata: Metadata = {
    title: "Blog | Psicólogo João Fernandes",
    description: "Artigos e discussões sobre psicologia, comportamento e saúde mental.",
};

export default async function BlogPage() {
    const payload = await getPayload({ config: configPromise });

    // Fetch published posts, sorted by date descending
    const posts = await payload.find({
        collection: "posts",
        limit: 100,
        sort: "-publishedDate",
    });

    // Prepare serializable posts for client component
    const serializablePosts = posts.docs.map(post => ({
        id: String(post.id),
        slug: post.slug as string,
        title: post.title as string,
        excerpt: post.excerpt as string,
        publishedDate: new Date(post.publishedDate).toISOString()
    }));

    return (
        <main className="container mx-auto px-4 py-20 min-h-screen">
            <BlogList posts={serializablePosts} />
        </main>
    );
}
