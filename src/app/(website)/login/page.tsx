import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Entrar | Blog João Fernandes",
    description: "Acesse sua conta para comentar nos artigos do blog.",
    robots: { index: false },
};

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
