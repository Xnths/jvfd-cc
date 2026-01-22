import { GraduationCap, Award, BookOpen, Medal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const qualifications = [
    {
        icon: GraduationCap,
        title: "Bacharelado em Psicologia",
        institution: "Pontifícia Universidade Católica de São Paulo (PUCSP)",
        year: "2018",
        description: "Formação generalista com ênfase em processos clínicos e saúde mental."
    },
    {
        icon: BookOpen,
        title: "Especialização em Análise do Comportamento",
        institution: "Instituto de Terapia por Contingências de Reforçamento (ITCR)",
        year: "2020",
        description: "Pós-graduação focada em intervenção clínica analítico-comportamental."
    },
    {
        icon: Award,
        title: "Formação em Terapia de Aceitação e Compromisso (ACT)",
        institution: "Centro de Estudo em Psicologia",
        year: "2021",
        description: "Curso avançado de extensão em terapias contextuais."
    },
    {
        icon: Medal,
        title: "Certificação em Psicopatologia",
        institution: "Instituto de Psiquiatria",
        year: "2022",
        description: "Aprofundamento em diagnóstico e manejo clínico."
    }
];

export function Excellence() {
    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-slate-900 mb-4 text-2xl">Excelência Profissional</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                        Compromisso com o aprendizado contínuo e a qualificação técnica para oferecer o melhor atendimento.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {qualifications.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <Card key={index} className="border-slate-200 hover:shadow-lg transition-shadow bg-slate-50">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                                        <Icon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <CardTitle className="text-slate-900 text-lg">{item.title}</CardTitle>
                                        <p className="text-sm text-slate-500 font-medium">{item.institution} • {item.year}</p>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-slate-600">
                                        {item.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
