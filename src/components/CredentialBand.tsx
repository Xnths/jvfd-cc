import { credentials } from "@/content/credentials";

/**
 * Credentials as styled text (no logos, no logo-like icons). "band" sits in a hero, above the CTA;
 * "list" is the stacked version for the profile section.
 */
export function CredentialBand({ variant = "band", className = "" }: { variant?: "band" | "list"; className?: string }) {
    if (variant === "list") {
        return (
            <ul className={`space-y-3 ${className}`}>
                {credentials.map((c) => (
                    <li key={c.title} className="border-l-2 border-slate-900 pl-3">
                        <span className="block font-semibold text-slate-900">{c.title}</span>
                        <span className="block text-sm text-slate-600">{c.institution}</span>
                    </li>
                ))}
            </ul>
        );
    }
    return (
        <ul className={`grid grid-cols-2 gap-1.5 md:grid-cols-4 md:gap-2 ${className}`} aria-label="Formação">
            {credentials.map((c) => (
                <li key={c.title} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 md:px-3 md:py-2">
                    <span className="block text-sm font-bold leading-tight text-slate-900">{c.short}</span>
                    <span className="block text-xs leading-snug text-slate-600">{c.title}</span>
                </li>
            ))}
        </ul>
    );
}
