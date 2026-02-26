import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import configPromise from "@payload-config";
import { AccountPage } from "@/components/AccountPage";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Minha conta | Blog João Fernandes",
    robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function ContaPage() {
    const headersList = await headers();
    const cookieStore = await cookies();
    const token = cookieStore.get("payload-token")?.value;

    if (!token) {
        redirect("/login");
    }

    const payload = await getPayload({ config: configPromise });

    let user: { id: string; name: string; email: string; subscribedToNewsletter: boolean } | null = null;
    try {
        const authResult = await payload.auth({ headers: headersList });
        if (
            authResult.user &&
            (authResult.user as unknown as { collection: string }).collection === "blog-users"
        ) {
            const u = authResult.user as unknown as {
                id: string;
                name: string;
                email: string;
                subscribedToNewsletter: boolean;
            };
            user = {
                id: u.id,
                name: u.name,
                email: u.email,
                subscribedToNewsletter: u.subscribedToNewsletter ?? false,
            };
        }
    } catch {
        redirect("/login");
    }

    if (!user) {
        redirect("/login");
    }

    return <AccountPage user={user} />;
}
