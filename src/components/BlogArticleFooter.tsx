"use client";

import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { MoveRight } from "lucide-react";
import { useWhatsappUrl } from "@/hooks/use-whatsapp-url";
import { useTimeToAction } from "@/hooks/use-time-to-action";
import { sendGAEvent } from "@next/third-parties/google";
import { ContactForm } from "./ContactForm";

interface RelatedPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    publishedDate: string;
}

interface BlogArticleFooterProps {
    relatedPosts: RelatedPost[];
}

export function BlogArticleFooter({ relatedPosts }: BlogArticleFooterProps) {
    const whatsappUrl = useWhatsappUrl();
    const { getElapsedTime } = useTimeToAction();

    const handleClick = () => {
        const elapsedTime = getElapsedTime() || 0;
        sendGAEvent("event", "schedule_click", {
            source: "blog_article_footer",
            time_to_click_ms: elapsedTime,
        });
    };

    return (
        <div className="mt-16 space-y-12">
            {/* CTA Block */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center">
                <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                    Quer aprofundar esse assunto?
                </h3>
                <p className="text-slate-600 mb-6 text-lg">
                    Vamos conversar. O primeiro passo pode ser mais simples do que você imagina.
                </p>

                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleClick}
                        className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-md text-lg font-bold transition-all shadow-lg hover:shadow-green-500/20"
                    >
                        <FaWhatsapp className="w-6 h-6" />
                        Conversar com o João
                    </a>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-slate-300"></div>
                        <span className="text-slate-500 text-sm">ou</span>
                        <div className="flex-1 h-px bg-slate-300"></div>
                    </div>

                    <ContactForm />
                </div>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-6">
                        Outros artigos que podem te interessar
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        {relatedPosts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/blog/${post.slug}`}
                                className="block p-5 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow group"
                            >
                                <span className="text-sm text-slate-500 mb-2 block">
                                    {new Date(post.publishedDate).toLocaleDateString("pt-BR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </span>
                                <h4 className="text-slate-900 font-medium mb-2 line-clamp-2 group-hover:text-green-700 transition-colors">
                                    {post.title}
                                </h4>
                                <p className="text-slate-600 text-sm line-clamp-2">{post.excerpt}</p>
                                <span className="inline-flex items-center text-green-600 font-medium text-sm mt-3 group-hover:gap-2 transition-all gap-1">
                                    Ler artigo
                                    <MoveRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
