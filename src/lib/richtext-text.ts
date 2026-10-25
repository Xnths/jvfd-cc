/** Plain text of a Lexical document (for JSON-LD answers and meta descriptions). */
export function plainText(doc: unknown): string {
    const parts: string[] = [];
    const walk = (n: unknown) => {
        if (!n || typeof n !== "object") return;
        const node = n as { text?: string; type?: string; children?: unknown[]; root?: unknown };
        if (typeof node.text === "string") parts.push(node.text);
        if (node.root) walk(node.root);
        for (const c of node.children ?? []) walk(c);
        if (node.type === "paragraph" || node.type === "heading" || node.type === "listitem") parts.push(" ");
    };
    walk(doc);
    return parts.join("").replace(/\s+/g, " ").trim();
}
