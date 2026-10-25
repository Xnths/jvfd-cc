import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import { PostSwap } from "@/edit/PostSwap";
import { DraftPost } from "@/edit/DraftPost";
import type { Metadata } from "next";
import Image from "next/image";
import { RichText } from "@/components/RichText";
import { BlogArticleFooter } from "@/components/BlogArticleFooter";
import { NewsletterForm } from "@/components/NewsletterForm";
import { CommentList } from "@/components/CommentList";
import { CommentForm } from "@/components/CommentForm";
import { ArticleEngagementTracker } from "@/components/ArticleEngagementTracker";
import { JsonLd } from "@/components/seo/JsonLd";
import { getMedia, getPostBySlug, getPublishedPosts } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { blogPostingNode, breadcrumbNode, graph } from "@/lib/jsonld";

// ISR: rendered on first request, then served from cache until the Go API
// invalidates the "posts" or "comments" tag.
export const revalidate = 86400;

interface PostPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateStaticParams() {
    // The Docker build has no database access; pages render on demand instead.
    if (!process.env.DATABASE_URI && !process.env.API_INTERNAL_URL) return [];
    try {
        const posts = await getPublishedPosts();
        return posts.map((post) => ({ slug: post.slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPostBySlug(slug);

    if (!post) {
        return { title: "Post não encontrado", robots: { index: false } };
    }

    return buildMetadata({
        title: post.title,
        description: post.excerpt,
        path: `/blog/${post.slug}`,
        type: "article",
        publishedTime: post.publishedDate,
        modifiedTime: post.updatedAt,
        keywords: post.keywords ? String(post.keywords).split(",").map((k) => k.trim()) : undefined,
    });
}

export default async function PostPage({ params }: PostPageProps) {
    const { slug } = await params;
    const post = await getPostBySlug(slug);

    if (!post) {
        // Drafts have no public page: an admin who opened one through /edit/enter writes it here.
        if ((await draftMode()).isEnabled) {
            return (
                <article className="container mx-auto px-4 py-20 min-h-screen max-w-4xl">
                    <DraftPost slug={slug} />
                </article>
            );
        }
        notFound();
    }

    const relatedPosts = (await getPublishedPosts())
        .filter((p) => p.slug !== slug)
        .slice(0, 3)
        .map((p) => ({
            id: String(p.id),
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            publishedDate: p.publishedDate,
        }));

    const image = getMedia(post.image);

    return (
        <article className="container mx-auto px-4 py-20 min-h-screen max-w-4xl">
            <JsonLd
                data={graph(
                    blogPostingNode({ ...post, imageUrl: image?.url }),
                    breadcrumbNode([
                        { name: "Blog", path: "/blog" },
                        { name: post.title, path: `/blog/${post.slug}` },
                    ]),
                )}
            />
            <ArticleEngagementTracker slug={slug} />
            <PostSwap postId={String(post.id)}>
            <header className="mb-12 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
                    <time dateTime={post.publishedDate}>
                        {new Date(post.publishedDate).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </time>
                    <span aria-hidden="true">•</span>
                    <span>Por {post.author || "João Vitor Fernandes"}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">
                    {post.title}
                </h1>
                {post.excerpt && (
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        {post.excerpt}
                    </p>
                )}
            </header>

            {image?.url && (
                <div className="mb-12">
                    <Image
                        src={image.url}
                        alt={image.alt || post.title}
                        width={1200}
                        height={630}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                        className="w-full h-auto rounded-xl object-cover"
                        priority
                    />
                </div>
            )}

            <div className="prose prose-lg prose-slate mx-auto prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl">
                <RichText content={post.content} />
            </div>
            </PostSwap>

            <BlogArticleFooter relatedPosts={relatedPosts} />

            <div className="mt-12 max-w-xl mx-auto">
                <NewsletterForm />
            </div>

            {/* Comments section */}
            <section className="mt-16 max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-slate-900 mb-6 uppercase">Comentários</h2>
                <CommentList postId={String(post.id)} />
                <div className="mt-8">
                    <CommentForm postId={String(post.id)} />
                </div>
            </section>
        </article>
    );
}
