import { getPayload } from "payload";

export const dynamic = "force-dynamic";
import configPromise from "@payload-config";
import { notFound } from "next/navigation";
import { RichText } from "@/components/RichText";
import { Metadata } from "next";

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

    return {
        title: `${posts.docs[0].title} | Blog João Fernandes`,
        description: posts.docs[0].excerpt,
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

    return (
        <article className="container mx-auto px-4 py-20 min-h-screen max-w-4xl">
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
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        {post.excerpt}
                    </p>
                )}
            </header>

            <div className="prose prose-lg prose-slate mx-auto prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl">
                <RichText content={post.content} />
            </div>
        </article>
    );
}


