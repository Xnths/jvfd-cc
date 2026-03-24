import { getPayload } from "payload";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
import configPromise from "@payload-config";
import { notFound } from "next/navigation";
import { RichText } from "@/components/RichText";
import { BlogArticleFooter } from "@/components/BlogArticleFooter";
import { NewsletterForm } from "@/components/NewsletterForm";
import { CommentList } from "@/components/CommentList";
import { CommentForm } from "@/components/CommentForm";
import { ArticleEngagementTracker } from "@/components/ArticleEngagementTracker";
import { Metadata } from "next";
import Image from "next/image";

interface PostPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const payload = await getPayload({ config: configPromise });
    const posts = await payload.find({
        collection: "posts",
        where: {
            slug: {
                equals: slug,
            },
        },
    });

    if (!posts.docs[0]) {
        return {
            title: "Post não encontrado",
        };
    }

    const post = posts.docs[0];

    return {
        title: `${post.title} | Blog João Fernandes`,
        description: post.excerpt,
        keywords: post.keywords ? String(post.keywords).split(',').map((k: string) => k.trim()) : undefined,
    };
}

export default async function PostPage({ params }: PostPageProps) {
    const { slug } = await params;
    const payload = await getPayload({ config: configPromise });
    const posts = await payload.find({
        collection: "posts",
        where: {
            slug: {
                equals: slug,
            },
        },
    });

    const post = posts.docs[0];

    if (!post) {
        notFound();
    }

    // Fetch latest 3 posts excluding the current one
    const relatedPostsResult = await payload.find({
        collection: "posts",
        limit: 3,
        sort: "-publishedDate",
        where: {
            slug: {
                not_equals: slug,
            },
        },
    });

    const relatedPosts = relatedPostsResult.docs.map((p) => ({
        id: p.id as string,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        publishedDate: p.publishedDate,
    }));

    return (
        <article className="container mx-auto px-4 py-20 min-h-screen max-w-4xl">
            <ArticleEngagementTracker slug={slug} />
            <header className="mb-12 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
                    <span>{new Date(post.publishedDate).toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    })}</span>
                    <span>•</span>
                    <span>Por {post.author || "João Vitor Fernandes"}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">
                    {post.title}
                </h1>
                {post.excerpt && (
                    <h2 className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        {post.excerpt}
                    </h2>
                )}
            </header>

            {post.image && typeof post.image === 'object' && 'url' in post.image && (
                <div className="mb-12">
                    <Image
                        src={post.image.url}
                        alt={post.image.alt || post.title}
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

            <BlogArticleFooter relatedPosts={relatedPosts} />

            <div className="mt-12 max-w-xl mx-auto">
                <NewsletterForm />
            </div>

            {/* Comments section */}
            <section className="mt-16 max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Comentários</h2>
                <CommentList postId={post.id as string} />
                <div className="mt-8">
                    <CommentFormWrapper postId={post.id as string} />
                </div>
            </section>
        </article>
    );
}

async function CommentFormWrapper({ postId }: { postId: string }) {
    const headersList = await headers();
    const payload = await getPayload({ config: configPromise });
    let sessionUser: { id: string; name: string } | null = null;
    try {
        const { user } = await payload.auth({ headers: headersList });
        if (user && (user as unknown as { collection: string }).collection === "blog-users") {
            sessionUser = { id: user.id as string, name: (user as unknown as { name: string }).name };
        }
    } catch {
        // unauthenticated
    }
    return <CommentForm postId={postId} user={sessionUser} />;
}
