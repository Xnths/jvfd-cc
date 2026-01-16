import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Psychology Clinic Landing Page",
    description: "Psychology Clinic Landing Page",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
