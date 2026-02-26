import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
    id: string;
    body: string;
    createdAt: string;
    authorName: string;
}

interface CommentListProps {
    postId: string;
}

async function fetchComments(postId: string): Promise<Comment[]> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/comments?postId=${postId}`, {
            cache: "no-store",
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.comments ?? [];
    } catch {
        return [];
    }
}

export async function CommentList({ postId }: CommentListProps) {
    const comments = await fetchComments(postId);

    if (comments.length === 0) {
        return (
            <p className="text-slate-500 text-sm italic">
                Ainda não há comentários aprovados. Seja o primeiro a comentar.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm shrink-0">
                            {comment.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900">{comment.authorName}</p>
                            <p className="text-xs text-slate-400">
                                {formatDistanceToNow(new Date(comment.createdAt), {
                                    addSuffix: true,
                                    locale: ptBR,
                                })}
                            </p>
                        </div>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                        {comment.body}
                    </p>
                </div>
            ))}
        </div>
    );
}
