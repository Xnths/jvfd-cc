import { faq } from "@/content/clinic";
import { tutoring } from "@/content/tutoring";
import { pickText, type TextMap } from "@/lib/texts";

// Copies of the structured content with João's inline edits applied, so JSON-LD matches what
// visitors read. Keys mirror the ones used by the components (home.faq.<id>.*, aulas.faq.<n>.*).

export function resolvedFaq(texts: TextMap) {
    return faq.map((item) => ({
        question: pickText(texts, `home.faq.${item.id}.question`, item.question),
        answer: pickText(texts, `home.faq.${item.id}.answer`, item.answer),
    }));
}

export function resolvedTutoringFaq(texts: TextMap) {
    return tutoring.faq.map((item, i) => ({
        question: pickText(texts, `aulas.faq.${i}.question`, item.question),
        answer: pickText(texts, `aulas.faq.${i}.answer`, item.answer),
    }));
}
