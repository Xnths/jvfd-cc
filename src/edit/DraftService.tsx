"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/admin/lib/adminFetch";
import { ServicePage } from "@/components/ServicePage";
import type { ServiceInfo } from "@/lib/queries";

type AdminPage = {
    page: { id: string; slug: string; title: string; subtitle: string };
    service?: ServiceInfo;
    serviceDraftBody: unknown;
};

/** A service that is not public yet: the same page, rendered from the draft for the admin writing it. */
export function DraftService({ slug }: { slug: string }) {
    const [data, setData] = useState<AdminPage | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api<AdminPage>(`/pages/slug:${encodeURIComponent(slug)}`).then(setData).catch((e) => setError(errorMessage(e)));
    }, [slug]);

    if (error) return <p className="my-32 text-center text-red-700">{error}</p>;
    if (!data?.service) return <p className="my-32 text-center text-slate-500">Carregando rascunho…</p>;
    return <ServicePage slug={slug} title={data.page.title} subtitle={data.page.subtitle} content={data.serviceDraftBody} service={data.service} pageId={data.page.id} />;
}
