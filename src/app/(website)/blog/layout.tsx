import { Header } from "@/components/Header";

export default function BlogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-svh">
            <Header />
            <main className="flex-grow">
                {children}
            </main>
        </div>
    );
}
