import { getPublishedPosts } from "@/lib/queries";
import Link from "next/link";
import { MoveRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Editable } from "@/edit/Editable";

export async function Discussions() {
    const posts = (await getPublishedPosts().catch(() => [])).slice(0, 3);

    if (posts.length === 0) {
        return null;
    }

    return (
        <section className="py-20 bg-slate-50" id="discussions">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <Editable as="h2" k="home.discussions.title" className="text-3xl font-bold text-slate-900 mb-4">Discussões</Editable>
                    <Editable as="p" k="home.discussions.subtitle" className="text-xl text-slate-600 max-w-2xl mx-auto">
                        Artigos e reflexões sobre psicologia e saúde mental.
                    </Editable>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                    {posts.map((post) => (
                        <Card key={post.id} className="border-slate-200 hover:shadow-lg transition-shadow bg-white flex flex-col">
                            <CardHeader>
                                <div className="text-sm text-slate-500 mb-2">
                                    {new Date(post.publishedDate).toLocaleDateString("pt-BR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </div>
                                <CardTitle className="text-xl text-slate-900 line-clamp-2">
                                    {post.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-slate-600 line-clamp-3">
                                    {post.excerpt}
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Link
                                    href={`/blog/${post.slug}`}
                                    className="inline-flex items-center text-blue-600 font-medium hover:gap-2 transition-all gap-1 group"
                                >
                                    <Editable k="home.discussions.read_more">Ler mais</Editable>
                                    <MoveRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="text-center">
                    <Link
                        href="/blog"
                        className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-white bg-slate-900 hover:bg-slate-800 md:text-lg md:px-10 transition-colors"
                    >
                        <Editable k="home.discussions.all">Ver todos os artigos</Editable>
                    </Link>
                </div>
            </div>
        </section>
    );
}
