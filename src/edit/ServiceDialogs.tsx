"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage } from "@/admin/lib/adminFetch";
import { slugify } from "@/admin/lib/slugify";
import { SERVICE_ICONS } from "@/lib/service-icons";
import { SERVICE_LAYOUTS, SERVICE_THEMES, type ServiceTheme } from "@/lib/service-themes";

type Fields = {
    name: string;
    cardTitle: string;
    cardDescription: string;
    category: "therapy" | "education";
    layout: string;
    theme: string;
    icon: string;
    badge: string;
    ctaText: string;
    whatsappMessage: string;
    showOnHome: "always" | "campaign" | "never";
    showInFooter: boolean;
    showContactSection: boolean;
};

const EMPTY: Fields = {
    name: "", cardTitle: "", cardDescription: "", category: "therapy", layout: "calming", theme: "teal", icon: "heart", badge: "",
    ctaText: "Agendar pelo WhatsApp", whatsappMessage: "Olá! Vi o site e gostaria de saber mais.", showOnHome: "always", showInFooter: true, showContactSection: true,
};

function Choices({ fields, set }: { fields: Fields; set: <K extends keyof Fields>(k: K, v: Fields[K]) => void }) {
    return (
        <>
            <div>
                <p className="mb-1 text-sm font-medium">Layout da página</p>
                <div className="grid grid-cols-2 gap-2">
                    {SERVICE_LAYOUTS.map((l) => (
                        <button key={l.value} type="button" onClick={() => set("layout", l.value)} aria-pressed={fields.layout === l.value}
                            className={`rounded-lg border p-2 text-left text-sm ${fields.layout === l.value ? "border-green-600 ring-2 ring-green-600/30" : "hover:bg-slate-50"}`}>
                            <span className="font-medium">{l.label}</span>
                            <span className="block text-xs text-slate-500">{l.hint}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <p className="mb-1 text-sm font-medium">Cor</p>
                <div className="flex flex-wrap gap-2">
                    {(Object.keys(SERVICE_THEMES) as ServiceTheme[]).map((t) => (
                        <button key={t} type="button" onClick={() => set("theme", t)} aria-pressed={fields.theme === t} title={SERVICE_THEMES[t].label}
                            className={`h-8 w-8 rounded-full ${SERVICE_THEMES[t].swatch} ${fields.theme === t ? "ring-2 ring-offset-2 ring-green-600" : ""}`} />
                    ))}
                </div>
            </div>
            <div>
                <p className="mb-1 text-sm font-medium">Ícone do cartão</p>
                <div className="flex flex-wrap gap-1.5">
                    {Object.entries(SERVICE_ICONS).map(([name, Icon]) => (
                        <button key={name} type="button" onClick={() => set("icon", name)} aria-pressed={fields.icon === name} title={name}
                            className={`rounded-md border p-2 ${fields.icon === name ? "border-green-600 bg-green-50" : "hover:bg-slate-50"}`}>
                            <Icon className="h-5 w-5" />
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

/** "+ Novo serviço": creates the draft page and opens it at its own URL, ready to be written in place. */
export function NewServiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const [f, setF] = useState<Fields>(EMPTY);
    const [slug, setSlug] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [taken, setTaken] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((x) => ({ ...x, [k]: v }));

    useEffect(() => {
        if (!slugTouched) setSlug(slugify(f.name));
    }, [f.name, slugTouched]);

    useEffect(() => {
        if (!slug) return setTaken(false);
        const t = setTimeout(() => {
            fetch(`/api/v1/public/pages/${encodeURIComponent(slug)}`).then((r) => setTaken(r.status === 200)).catch(() => setTaken(false));
        }, 300);
        return () => clearTimeout(t);
    }, [slug]);

    async function create() {
        setBusy(true);
        setError(null);
        try {
            await api("/services", {
                method: "POST",
                json: { slug, ...f, cardTitle: f.cardTitle || f.name, badge: f.badge || f.name },
            });
            window.location.href = `/edit/enter?return=${encodeURIComponent(`/${slug}`)}`;
        } catch (e) {
            setError(errorMessage(e));
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Novo serviço</DialogTitle>
                    <DialogDescription>Cria a página, o cartão na home e o link no rodapé. Você escreve o texto na própria página e publica quando estiver pronto.</DialogDescription>
                </DialogHeader>
                <label className="grid gap-1 text-sm font-medium">Nome do serviço
                    <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Orientação de carreira" />
                </label>
                <label className="grid gap-1 text-sm font-medium">Endereço da página
                    <Input value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
                    <span className={`text-xs font-normal ${taken ? "text-red-700" : "text-slate-500"}`}>{taken ? "Já existe uma página com este endereço." : `psicologojoaofernandes.com/${slug}`}</span>
                </label>
                <label className="grid gap-1 text-sm font-medium">Categoria
                    <select className="rounded-md border bg-white px-3 py-2 text-sm font-normal" value={f.category} onChange={(e) => set("category", e.target.value as Fields["category"])}>
                        <option value="therapy">Atendimento psicológico</option>
                        <option value="education">Serviço educacional (separado da terapia)</option>
                    </select>
                </label>
                <Choices fields={f} set={set} />
                <label className="grid gap-1 text-sm font-medium">Título do cartão na home
                    <Input value={f.cardTitle} onChange={(e) => set("cardTitle", e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm font-medium">Descrição do cartão
                    <Textarea rows={3} value={f.cardDescription} onChange={(e) => set("cardDescription", e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm font-medium">Texto do botão
                    <Input value={f.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm font-medium">Mensagem inicial do WhatsApp
                    <Textarea rows={2} value={f.whatsappMessage} onChange={(e) => set("whatsappMessage", e.target.value)} />
                </label>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
                    <Button onClick={create} disabled={busy || !f.name.trim() || !slug || taken}>Criar e escrever na página</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type ServiceResponse = { page: { id: string; slug: string; status: string }; service?: Fields & { id: string; campaignKey: string | null } };

/** Settings of the service whose page the admin is looking at. */
export function ServiceSettingsDialog({ open, onOpenChange, slug }: { open: boolean; onOpenChange: (o: boolean) => void; slug: string }) {
    const [data, setData] = useState<ServiceResponse | null>(null);
    const [f, setF] = useState<Fields>(EMPTY);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((x) => ({ ...x, [k]: v }));

    useEffect(() => {
        if (!open) return;
        api<ServiceResponse>(`/pages/slug:${encodeURIComponent(slug)}`).then((d) => {
            setData(d);
            if (d.service) setF({ ...EMPTY, ...d.service });
        }).catch((e) => setError(errorMessage(e)));
    }, [open, slug]);

    const published = data?.page.status === "published";
    const run = async (fn: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const save = () => run(async () => {
        if (!data?.service) return;
        await api(`/services/${data.service.id}`, { method: "PATCH", json: { ...f } });
        window.location.reload();
    });
    const unpublish = () => run(async () => {
        if (!data || !confirm("Tirar esta página do ar? Ela some do site, da home e do rodapé.")) return;
        await api(`/pages/${data.page.id}/unpublish`, { method: "POST" });
        window.location.reload();
    });

    const analyticsKey = useMemo(() => `service_page_${slug}`, [slug]);
    return (
        <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Configurar serviço</DialogTitle>
                    <DialogDescription>{published ? "Publicado" : "Rascunho"} · /{slug} · medição: {analyticsKey}</DialogDescription>
                </DialogHeader>
                {!data ? <p className="text-sm text-slate-500">{error ?? "Carregando…"}</p> : (
                    <>
                        <label className="grid gap-1 text-sm font-medium">Nome
                            <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
                        </label>
                        <Choices fields={f} set={set} />
                        <label className="grid gap-1 text-sm font-medium">Título do cartão
                            <Input value={f.cardTitle} onChange={(e) => set("cardTitle", e.target.value)} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">Descrição do cartão
                            <Textarea rows={3} value={f.cardDescription} onChange={(e) => set("cardDescription", e.target.value)} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">Selo acima do título
                            <Input value={f.badge} onChange={(e) => set("badge", e.target.value)} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">Texto do botão
                            <Input value={f.ctaText} onChange={(e) => set("ctaText", e.target.value)} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">Mensagem inicial do WhatsApp
                            <Textarea rows={2} value={f.whatsappMessage} onChange={(e) => set("whatsappMessage", e.target.value)} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">Cartão na home
                            <select className="rounded-md border bg-white px-3 py-2 text-sm font-normal" value={f.showOnHome} onChange={(e) => set("showOnHome", e.target.value as Fields["showOnHome"])}>
                                <option value="always">Sempre</option>
                                <option value="campaign">Só na campanha (?{data.service?.campaignKey ?? "lgbt"}=true)</option>
                                <option value="never">Nunca</option>
                            </select>
                        </label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.showInFooter} onChange={(e) => set("showInFooter", e.target.checked)} /> Mostrar no rodapé</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.showContactSection} onChange={(e) => set("showContactSection", e.target.checked)} /> Mostrar a seção de contato no fim da página</label>
                    </>
                )}
                {error && data && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <DialogFooter className="gap-2 sm:justify-between">
                    {published ? <Button variant="outline" onClick={unpublish} disabled={busy}>Despublicar</Button> : <span />}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
                        <Button onClick={save} disabled={busy || !data?.service}>Salvar</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
