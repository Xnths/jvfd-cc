// Server-rendered structured data: present in the initial HTML so crawlers
// that don't execute JavaScript (most LLM crawlers) still read it.
export function JsonLd({ data }: { data: object }) {
    return (
        <script
            type="application/ld+json"
            // "<" is escaped so CMS content can never close the script tag.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
        />
    );
}
