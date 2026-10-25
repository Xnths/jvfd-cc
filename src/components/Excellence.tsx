"use client"

import { GraduationCap, BookOpen, Hospital, Brain, Activity, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle } from "./ui/card";
import Link from "next/link";
import { qualifications as baseQualifications, links } from "@/content/clinic";
import { Editable } from "@/edit/Editable";


const QUALIFICATION_ICONS = {
    graduacao: GraduationCap,
    hospitalar: Hospital,
    neuropsicologia: Brain,
    neurociencias: Activity,
    filosofia: BookOpen,
} as const;

const qualifications = baseQualifications.map((q) => ({
    ...q,
    icon: QUALIFICATION_ICONS[q.key],
}));

export function Excellence() {


    return (
        <section className="py-20 bg-white" id="excellence">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <Editable as="h2" k="home.excellence.title" className="text-slate-900 mb-4 text-3xl">Formações e qualificações</Editable>
                    <Editable as="p" k="home.excellence.subtitle" className="text-slate-600 max-w-2xl mx-auto text-lg">
                        Compromisso com o aprendizado contínuo e a qualificação técnica para oferecer o melhor atendimento.
                    </Editable>
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
                                        <CardTitle className="text-slate-900 text-lg"><Editable k={`home.excellence.${item.key}.title`}>{item.title}</Editable></CardTitle>
                                        <Editable as="p" k={`home.excellence.${item.key}.institution`} className="text-sm text-slate-500 font-medium">{item.institution}</Editable>
                                    </div>
                                </CardHeader>
                            </Card>
                        );
                    })}
                    <Card key={"lattes"} className="border-slate-200 hover:shadow-lg transition-shadow bg-slate-50">
                        <CardHeader className="flex flex-row items-center justify-between gap-4 mb-4 flex-1">
                            <div className="flex flex-row items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                                    <GraduationCap className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex flex-col">
                                    <CardTitle className="text-slate-900 text-lg"><Editable k="home.excellence.lattes.title">Currículo Lattes</Editable></CardTitle>
                                    <Editable as="p" k="home.excellence.lattes.subtitle" className="text-sm text-slate-500 font-medium">Plataforma Lattes</Editable>
                                </div>
                            </div>
                            <Link href={links.lattes} target="_blank" rel="noopener noreferrer" aria-label="Acessar Currículo Lattes">
                                <ExternalLink className="w-5 h-5" />
                            </Link>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </section>
    );
}
