// Titles shown on /avaliacao-neuropsicologica and its condition pages (hero band, "Quem conduz", JSON-LD alumniOf).
// Built from `qualifications` in clinic.ts, so each title is written once. Only real titles (CFP Res. 010/2005):
// add an entry only when the owner confirms it. No logos: credentials are rendered as text.

import { qualifications } from "@/content/clinic";

export type Credential = {
    /** Full institution name, as in clinic.ts. */
    institution: string;
    /** Short name, bold in the band. */
    short: string;
    title: string;
    type: "pos-graduacao" | "graduacao" | "curso";
    year?: number;
};

type QualificationKey = (typeof qualifications)[number]["key"];

function from(key: QualificationKey, short: string, type: Credential["type"]): Credential {
    const q = qualifications.find((x) => x.key === key)!;
    return { institution: q.institution, short, title: q.title, type };
}

export const credentials: Credential[] = [
    from("neuropsicologia", "Hospital Israelita Albert Einstein", "pos-graduacao"),
    from("neurociencias", "PUCPR", "pos-graduacao"),
    from("graduacao", "PUC-SP", "graduacao"),
    from("filosofia", "Universidade Harvard", "curso"),
];
