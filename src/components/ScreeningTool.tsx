"use client";

import { useState } from "react";
import { FREQUENCY, type Screening } from "@/content/screening";

/**
 * Self-report screening. Answers live in this component's state only: nothing is stored, sent or tracked
 * (`ph-no-capture` keeps PostHog autocapture away from the answers; no analytics event is fired here).
 */
export function ScreeningTool({ tool }: { tool: Screening }) {
    const [answers, setAnswers] = useState<(number | null)[]>(() => tool.items.map(() => null));
    const [done, setDone] = useState(false);
    const complete = answers.every((a) => a !== null);
    const score = answers.reduce<number>((sum, a) => sum + (a ?? 0), 0);
    const band = tool.bands.find((b) => score <= b.max) ?? tool.bands[tool.bands.length - 1];
    const flagged = tool.safetyItem !== undefined && (answers[tool.safetyItem] ?? 0) > 0;

    const reset = () => {
        setAnswers(tool.items.map(() => null));
        setDone(false);
        window.scrollTo({ top: 0 });
    };

    return (
        <div className="ph-no-capture" data-ph-no-capture>
            {!done ? (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (complete) {
                            setDone(true);
                            window.scrollTo({ top: 0 });
                        }
                    }}
                    className="space-y-6"
                >
                    <p className="text-lg text-slate-700">{tool.intro}</p>
                    {tool.items.map((item, i) => (
                        <fieldset key={i} className="rounded-xl border border-slate-200 p-4">
                            <legend className="px-1 text-base font-medium text-slate-900">{i + 1}. {item}</legend>
                            <div className="mt-2 grid gap-2 sm:grid-cols-4">
                                {FREQUENCY.map((f) => (
                                    <label key={f.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${answers[i] === f.value ? "border-green-600 bg-green-50 text-green-900" : "border-slate-200 hover:bg-slate-50"}`}>
                                        <input type="radio" name={`q${i}`} className="accent-green-700" checked={answers[i] === f.value} onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? f.value : v)))} />
                                        {f.label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                    <button type="submit" disabled={!complete} className="rounded-md bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                        Ver resultado
                    </button>
                    {!complete && <p className="text-sm text-slate-500">Responda todas as perguntas para ver o resultado.</p>}
                </form>
            ) : (
                <div className="space-y-5" role="status">
                    {flagged && (
                        <div role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-5 text-red-900">
                            <p className="text-lg font-bold">Você marcou pensamentos de se machucar ou de que seria melhor estar morto(a).</p>
                            <p className="mt-2">Você não precisa passar por isso sozinho(a). Fale agora com alguém: ligue <strong>188 (CVV, 24 horas, gratuito)</strong> ou <strong>192 (SAMU)</strong>, ou vá à UPA ou ao pronto-socorro mais próximo. Se puder, avise uma pessoa de confiança.</p>
                        </div>
                    )}
                    <div className="rounded-xl border border-slate-200 p-5">
                        <p className="text-sm uppercase tracking-widest text-slate-500">Pontuação</p>
                        <p className="text-5xl font-bold text-slate-900">{score}</p>
                        <p className="mt-1 text-xl font-semibold text-green-800">{band.label}</p>
                        <p className="mt-3 text-slate-700">{band.note}</p>
                    </div>
                    <p className="text-sm text-slate-600">Este questionário é uma triagem e não faz diagnóstico. Só um profissional de saúde mental pode avaliar o que está acontecendo com você. O resultado não foi guardado nem enviado a ninguém.</p>
                    <button type="button" onClick={reset} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Refazer</button>
                </div>
            )}
        </div>
    );
}
