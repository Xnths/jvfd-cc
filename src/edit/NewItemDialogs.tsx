"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage } from "@/admin/lib/adminFetch";
import { slugify } from "@/admin/lib/slugify";

/** One-field "create and open on its page" dialogs for glossary terms and team profiles. */
function NewItem({ title, description, label, placeholder, onCreate, onClose }: {
    title: string; description: string; label: string; placeholder: string;
    onCreate: (name: string, slug: string) => Promise<string>; onClose: () => void;
}) {
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [touched, setTouched] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!touched) setSlug(slugify(name));
    }, [name, touched]);
    return (
        <Dialog open onOpenChange={(o) => !busy && !o && onClose()}>
            <DialogContent>
                <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
                <label className="grid gap-1 text-sm font-medium">{label}<Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} /></label>
                <label className="grid gap-1 text-sm font-medium">Endereço<Input value={slug} onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); }} /></label>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
                    <Button disabled={busy || !name.trim() || !slug} onClick={async () => {
                        setBusy(true);
                        setError(null);
                        try {
                            const path = await onCreate(name.trim(), slug);
                            window.location.href = `/edit/enter?return=${encodeURIComponent(path)}`;
                        } catch (e) {
                            setError(errorMessage(e));
                            setBusy(false);
                        }
                    }}>Criar e escrever na página</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function NewTermDialog({ onClose }: { onClose: () => void }) {
    return (
        <NewItem
            title="Novo termo do glossário" description="Cria um rascunho. Você escreve a definição na própria página e publica com a revisão de um psicólogo."
            label="Termo" placeholder="Ex.: Reforço positivo" onClose={onClose}
            onCreate={async (term, slug) => {
                const r = await api<{ slug: string }>("/glossary", { method: "POST", json: { term, slug } });
                return `/glossario/${r.slug}`;
            }}
        />
    );
}

export function NewProfileDialog({ onClose }: { onClose: () => void }) {
    return (
        <NewItem
            title="Novo perfil da equipe" description="O perfil começa oculto: você preenche na própria página e só então o torna público."
            label="Nome" placeholder="Ex.: Jonathas Castilhoes" onClose={onClose}
            onCreate={async (displayName, slug) => {
                await api("/profiles", { method: "POST", json: { slug, displayName } });
                return `/sobre/${slug}`;
            }}
        />
    );
}
