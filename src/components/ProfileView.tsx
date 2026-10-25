import Image from "next/image";
import { RichText } from "@/components/RichText";
import type { ProfileDoc } from "@/lib/queries";

const LABELS: Record<string, string> = { instagram: "Instagram", linkedin: "LinkedIn", lattes: "Currículo Lattes", oneliv: "Consultório Livance", site: "Site" };

function period(e: { startDate?: string | null; endDate?: string | null; isCurrent: boolean }) {
    const y = (d?: string | null) => (d ? d.slice(0, 4) : "");
    if (!e.startDate && !e.endDate && !e.isCurrent) return "";
    return `${y(e.startDate)} – ${e.isCurrent ? "atual" : y(e.endDate)}`.replace(/^ – /, "");
}

/** The public profile, LinkedIn-style: header, about, sections with entries. */
export function ProfileView({ profile: p }: { profile: ProfileDoc }) {
    const photo = p.photo?.url ? p.photo : null;
    return (
        <>
            <header className="mb-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
                {photo?.url && (
                    <Image src={photo.url} alt={photo.alt || p.displayName} width={160} height={160} className="h-40 w-40 shrink-0 rounded-full object-cover shadow-md" priority />
                )}
                <div>
                    <h1 className="text-4xl font-bold text-slate-900">{p.displayName}</h1>
                    <p className="mt-1 text-xl text-slate-600">{p.jobTitle}{p.isClinician && p.crp ? ` · CRP ${p.crp}` : ""}</p>
                    {p.approach && <p className="mt-1 text-slate-500">{p.approach}</p>}
                    {p.practicingSince && <p className="mt-1 text-sm text-slate-500">Em atuação desde {p.practicingSince}</p>}
                    <ul className="mt-4 flex flex-wrap justify-center gap-3 text-sm sm:justify-start">
                        {Object.entries(p.links ?? {}).filter(([, v]) => v).map(([k, v]) => (
                            <li key={k}><a href={v} target="_blank" rel="noopener noreferrer me" className="text-green-700 underline underline-offset-2">{LABELS[k] ?? k}</a></li>
                        ))}
                    </ul>
                </div>
            </header>
            {p.bio && (
                <section className="mb-10"><h2 className="mb-3 text-2xl font-semibold text-slate-900">Sobre</h2><div className="prose prose-lg prose-slate max-w-none"><RichText content={p.bio} /></div></section>
            )}
            {(p.sections ?? []).filter((s) => s.entries.length).map((s) => (
                <section key={s.id} className="mb-10">
                    <h2 className="mb-4 text-2xl font-semibold text-slate-900">{s.title}</h2>
                    <ul className="space-y-5">
                        {s.entries.map((e) => (
                            <li key={e.id} className="border-l-2 border-green-700/30 pl-4">
                                <p className="font-semibold text-slate-900">{e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{e.title}</a> : e.title}</p>
                                {(e.organization || e.location) && <p className="text-slate-600">{[e.organization, e.location].filter(Boolean).join(" · ")}</p>}
                                {period(e) && <p className="text-sm text-slate-500">{period(e)}</p>}
                                {e.description && <p className="mt-1 text-slate-600">{e.description}</p>}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </>
    );
}
