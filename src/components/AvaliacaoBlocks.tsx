"use client";

import type { ReactNode } from "react";
import { useEdit } from "@/edit/EditContext";

// Blocks shared by /avaliacao-neuropsicologica (ServicePage LandingLayout) and its condition pages. They take
// already-rendered text nodes (<SE>/<Editable>), so each page keeps its own copy keys.

/** Short facts under the hero CTA. */
export function FactChips({ items, className = "" }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Informações rápidas">
      {items.map((item, i) => (
        <li key={i} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium leading-tight text-slate-700 md:text-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** "Ainda não tem pedido médico?" band with its own (tracked) CTA. */
export function NoReferralBand({ title, text, cta, className = "" }: { title: ReactNode; text: ReactNode; cta: ReactNode; className?: string }) {
  return (
    <aside className={`rounded-2xl border-2 border-green-700/20 bg-green-50 p-5 md:flex md:items-center md:justify-between md:gap-8 md:p-8 ${className}`}>
      <div className="md:max-w-2xl">
        <h2 className="font-serif text-xl md:text-2xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-base text-slate-700 leading-relaxed">{text}</p>
      </div>
      <div className="mt-4 shrink-0 md:mt-0">{cta}</div>
    </aside>
  );
}

/** "O que levar" checklist. */
export function BringList({ title, items, className = "" }: { title: ReactNode; items: ReactNode[]; className?: string }) {
  return (
    <div className={className}>
      <h2 className="font-serif text-2xl md:text-3xl font-semibold text-slate-900 mb-5">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-base text-slate-800">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white" aria-hidden>
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * FAQ as native <details>: answers stay in the HTML (search engines, the markdown twin and JSON-LD read the same
 * text). In edit mode every item is open so the inline editor can reach the answers.
 */
export function FaqAccordion({ items }: { items: { id: number | string; question: ReactNode; answer: ReactNode }[] }) {
  const { editing } = useEdit();
  return (
    <ul className="divide-y divide-slate-200 border-y border-slate-200">
      {items.map((f) => (
        <li key={f.id}>
          <details className="group" open={editing || undefined}>
            <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 rounded-sm">
              <h3 className="text-base md:text-lg font-semibold text-slate-900">{f.question}</h3>
              <span className="mt-1 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </summary>
            <div className="pb-5 pr-2 md:pr-8 text-slate-700 leading-relaxed">{f.answer}</div>
          </details>
        </li>
      ))}
    </ul>
  );
}
