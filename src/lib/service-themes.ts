// Theme names stored in Postgres → the exact Tailwind class strings (kept whole so Tailwind sees them).
export type ServiceTheme = "teal" | "amber" | "slate" | "green" | "stone" | "slate_dark" | "violet";

export const SERVICE_THEMES: Record<ServiceTheme, { label: string; heroBg: string; heroHeadingClass: string; heroSubtitleClass: string; ctaBtnClass: string; accentTextClass: string; swatch: string }> = {
    teal: {
        label: "Verde-água",
        heroBg: "bg-teal-50", heroHeadingClass: "text-teal-900", heroSubtitleClass: "text-teal-700",
        ctaBtnClass: "bg-teal-700 hover:bg-teal-800 text-white focus-visible:ring-teal-500", accentTextClass: "text-teal-700", swatch: "bg-teal-600",
    },
    slate: {
        label: "Cinza",
        heroBg: "bg-white", heroHeadingClass: "text-slate-900", heroSubtitleClass: "text-slate-600",
        ctaBtnClass: "bg-slate-900 hover:bg-slate-700 text-white focus-visible:ring-slate-500", accentTextClass: "text-slate-700", swatch: "bg-slate-700",
    },
    green: {
        label: "Verde",
        heroBg: "bg-white", heroHeadingClass: "text-slate-900", heroSubtitleClass: "text-slate-600",
        ctaBtnClass: "bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-500", accentTextClass: "text-green-700", swatch: "bg-green-600",
    },
    amber: {
        label: "Âmbar",
        heroBg: "bg-amber-50", heroHeadingClass: "text-amber-900", heroSubtitleClass: "text-amber-800",
        ctaBtnClass: "bg-amber-700 hover:bg-amber-800 text-white focus-visible:ring-amber-500", accentTextClass: "text-amber-700", swatch: "bg-amber-600",
    },
    stone: {
        label: "Areia",
        heroBg: "bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50", heroHeadingClass: "text-stone-900", heroSubtitleClass: "text-stone-600",
        ctaBtnClass: "bg-stone-800 hover:bg-stone-700 text-white focus-visible:ring-stone-500", accentTextClass: "text-stone-700", swatch: "bg-stone-500",
    },
    slate_dark: {
        label: "Escuro",
        heroBg: "bg-slate-900", heroHeadingClass: "text-white", heroSubtitleClass: "text-slate-300",
        ctaBtnClass: "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500", accentTextClass: "text-red-400", swatch: "bg-slate-900",
    },
    violet: {
        label: "Violeta",
        heroBg: "bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50", heroHeadingClass: "text-violet-900", heroSubtitleClass: "text-violet-700",
        ctaBtnClass: "bg-violet-700 hover:bg-violet-800 text-white focus-visible:ring-violet-500", accentTextClass: "text-violet-600", swatch: "bg-violet-600",
    },
};

export const SERVICE_LAYOUTS = [
    { value: "calming", label: "Acolhedor", hint: "Espaçado, convite suave. Bom para terapia individual e de casal." },
    { value: "structured", label: "Estruturado", hint: "Texto à esquerda, caixa de contato fixa à direita." },
    { value: "plantao", label: "Plantão", hint: "Resposta rápida, botão grande, sem seção de contato." },
    { value: "exploratory", label: "Exploratório", hint: "Visual quente, convite à descoberta." },
    { value: "supervisao", label: "Profissional", hint: "Tom técnico, para colegas psicólogos." },
    { value: "affirmative", label: "Afirmativo", hint: "Cores do arco-íris, acolhimento LGBTQIA+." },
] as const;

// Service landing pages (src/content/service-landings.ts). Whole class strings so Tailwind sees them.
export type LandingTheme = "green" | "teal" | "slate" | "amber" | "stone" | "slate_dark" | "violet";

export const LANDING_THEMES: Record<LandingTheme, { heroBg: string; heroHeading: string; heroText: string; heroNote: string; heroEyebrow: string; eyebrow: string; cta: string; dot: string; soft: string; band: string; bandAccent: string; line: string; stepBg: string }> = {
    green: { heroBg: "bg-gradient-to-b from-slate-50 to-white", heroHeading: "text-slate-900", heroText: "text-slate-600", heroNote: "text-slate-600", heroEyebrow: "text-green-700", eyebrow: "text-green-700", cta: "bg-green-700 hover:bg-green-800 text-white focus-visible:ring-green-500", dot: "bg-green-600", soft: "bg-green-50", band: "bg-slate-900", bandAccent: "text-green-400", line: "border-green-200", stepBg: "bg-green-700" },
    teal: { heroBg: "bg-teal-50", heroHeading: "text-teal-950", heroText: "text-teal-800", heroNote: "text-teal-900", heroEyebrow: "text-teal-700", eyebrow: "text-teal-700", cta: "bg-teal-700 hover:bg-teal-800 text-white focus-visible:ring-teal-500", dot: "bg-teal-600", soft: "bg-teal-50", band: "bg-teal-950", bandAccent: "text-teal-300", line: "border-teal-200", stepBg: "bg-teal-700" },
    slate: { heroBg: "bg-slate-100", heroHeading: "text-slate-900", heroText: "text-slate-600", heroNote: "text-slate-600", heroEyebrow: "text-blue-800", eyebrow: "text-blue-800", cta: "bg-blue-800 hover:bg-blue-900 text-white focus-visible:ring-blue-500", dot: "bg-blue-700", soft: "bg-slate-100", band: "bg-slate-900", bandAccent: "text-blue-300", line: "border-blue-200", stepBg: "bg-blue-800" },
    amber: { heroBg: "bg-amber-50", heroHeading: "text-amber-950", heroText: "text-amber-900", heroNote: "text-amber-900", heroEyebrow: "text-amber-800", eyebrow: "text-amber-800", cta: "bg-amber-800 hover:bg-amber-900 text-white focus-visible:ring-amber-500", dot: "bg-amber-700", soft: "bg-amber-50", band: "bg-amber-950", bandAccent: "text-amber-300", line: "border-amber-200", stepBg: "bg-amber-800" },
    stone: { heroBg: "bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50", heroHeading: "text-stone-900", heroText: "text-stone-600", heroNote: "text-stone-600", heroEyebrow: "text-stone-700", eyebrow: "text-stone-700", cta: "bg-stone-800 hover:bg-stone-700 text-white focus-visible:ring-stone-500", dot: "bg-stone-500", soft: "bg-stone-100", band: "bg-stone-900", bandAccent: "text-amber-300", line: "border-stone-300", stepBg: "bg-stone-700" },
    slate_dark: { heroBg: "bg-slate-900", heroHeading: "text-white", heroText: "text-slate-300", heroNote: "text-slate-300", heroEyebrow: "text-red-400", eyebrow: "text-red-700", cta: "bg-red-700 hover:bg-red-800 text-white focus-visible:ring-red-500", dot: "bg-red-600", soft: "bg-slate-100", band: "bg-slate-800", bandAccent: "text-red-300", line: "border-red-200", stepBg: "bg-red-700" },
    violet: { heroBg: "bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50", heroHeading: "text-violet-950", heroText: "text-violet-800", heroNote: "text-violet-900", heroEyebrow: "text-violet-700", eyebrow: "text-violet-700", cta: "bg-violet-700 hover:bg-violet-800 text-white focus-visible:ring-violet-500", dot: "bg-violet-600", soft: "bg-violet-50", band: "bg-violet-950", bandAccent: "text-violet-300", line: "border-violet-200", stepBg: "bg-violet-700" },
};
