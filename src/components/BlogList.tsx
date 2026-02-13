"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MoveRight, Search } from "lucide-react";
import Fuse from "fuse.js";

interface Post {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    publishedDate: string;
}

interface BlogListProps {
    posts: Post[];
}

export function BlogList({ posts }: BlogListProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const fuse = useMemo(() => {
        return new Fuse(posts, {
            keys: ["title", "excerpt"],
            threshold: 0.4,
            includeScore: true,
        });
    }, [posts]);

    const filteredPosts = useMemo(() => {
        if (!searchTerm) return posts;

        const results = fuse.search(searchTerm);
        return results.map((result) => result.item);
    }, [searchTerm, posts, fuse]);

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-4 text-slate-900">Blog e Discussões</h1>
            <p className="text-xl text-slate-600 mb-8">
                Explorando temas da psicologia comportamental e saúde mental.
            </p>

            <div className="relative mb-12">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
                    placeholder="Pesquisar artigos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-8">
                {filteredPosts.map((post) => (
                    <article key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h2 className="text-2xl font-semibold text-slate-900">
                                <Link href={`/blog/${post.slug}`} className="hover:text-blue-600 transition-colors">
                                    {post.title}
                                </Link>
                            </h2>
                            <span className="text-sm text-slate-500 whitespace-nowrap">
                                {new Date(post.publishedDate).toLocaleDateString("pt-BR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                        </div>

                        <p className="text-slate-600 mb-6 line-clamp-3">
                            {post.excerpt}
                        </p>

                        <Link
                            href={`/blog/${post.slug}`}
                            className="inline-flex items-center text-blue-600 font-medium hover:gap-2 transition-all gap-1 group"
                        >
                            Ler artigo completo
                            <MoveRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </article>
                ))}

                {filteredPosts.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl">
                        <p className="text-slate-500">Nenhum artigo encontrado para "{searchTerm}".</p>
                    </div>
                )}
            </div>
        </div>
    );
}
