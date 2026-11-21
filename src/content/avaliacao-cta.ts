// Tiny module (no page content) so client components on every page can import it without pulling avaliacoes.ts.

export const AVALIACAO_PATH = "/avaliacao-neuropsicologica";

/** Same text and analytics key as the service row (migration 0010). The live values come from Postgres; these are the fallback.
 * The Google Ads upload tells avaliação leads apart by this exact text: do not change it. */
export const AVALIACAO_WHATSAPP_MESSAGE = "Olá, gostaria de informações sobre a avaliação neuropsicológica.";
export const AVALIACAO_ANALYTICS_KEY = "service_page_avaliacao-neuropsicologica";

export function isAvaliacaoPath(pathname: string | null | undefined): boolean {
    return !!pathname && (pathname === AVALIACAO_PATH || pathname.startsWith(`${AVALIACAO_PATH}/`));
}
