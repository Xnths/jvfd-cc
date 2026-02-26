import { RegisterForm } from "@/components/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Criar conta | Blog João Fernandes",
    description: "Crie sua conta para comentar nos artigos do blog.",
    robots: { index: false },
};

export default function RegisterPage() {
    return <RegisterForm />;
}
