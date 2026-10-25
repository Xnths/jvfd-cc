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
