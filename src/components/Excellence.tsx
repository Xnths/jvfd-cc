"use client"

import { GraduationCap, BookOpen, Hospital, Brain, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle } from "./ui/card";


const qualifications = [
    {
        icon: GraduationCap,
        title: "Bacharelado em Psicologia",
        institution: "Pontifícia Universidade Católica de São Paulo (PUCSP)",
    },
    {
        icon: Hospital,
        title: "Aperfeiçoamento em Psicologia Hospitalar",
        institution: "Psicocare",
    },
    {
        icon: Brain,
        title: "Pós-graduação em Neuropsicologia",
        institution: "Hospital Israelita Albert Einstein",
    },
    {
        icon: Activity,
        title: "Pós-graduação em Neurociências, Comportamento e Psicopatologia",
        institution: "Pontifícia Universidade Católica do Paraná (PUCPR)",
    },
    {
        icon: BookOpen,
        title: "Curso em Filosofia Oriental",
        institution: "Universidade Harvard",
    }
];

export function Excellence() {


    return (
        <section className="py-20 bg-white" id="excellence">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-slate-900 mb-4 text-2xl">Formações e qualificações</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                        Compromisso com o aprendizado contínuo e a qualificação técnica para oferecer o melhor atendimento.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {qualifications.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <Card key={index} className="border-slate-200 hover:shadow-lg transition-shadow bg-slate-50">
                                <CardHeader className="flex flex-row items-center gap-4 mb-4 flex-1">
                                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                                        <Icon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <CardTitle className="text-slate-900 text-lg">{item.title}</CardTitle>
                                        <p className="text-sm text-slate-500 font-medium">{item.institution}</p>
                                    </div>
                                </CardHeader>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
