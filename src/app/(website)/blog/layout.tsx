import { Header } from "@/components/Header";

export default function BlogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-svh">
            <Header />
            <div className="flex-grow">
                {children}
            </div>
        </div>
    );
}
