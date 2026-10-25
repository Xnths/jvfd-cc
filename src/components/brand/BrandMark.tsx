// Connectome mark: a brain drawn as a network of nodes. The accent node is the
// point of the network where therapy acts. Plain SVG so it also renders inside
// next/og ImageResponse (pass explicit colors there).

const NODES: Record<string, [number, number]> = {
    a: [9, 31], b: [15, 19], c: [27, 11], d: [41, 11], e: [52, 19], f: [56, 31], g: [49, 42],
    h: [37, 38], i: [24, 40], j: [22, 26], k: [36, 24], l: [47, 29], m: [33, 52], n: [31, 59],
};

const EDGES = [
    "ab", "bc", "cd", "de", "ef", "fg", "gh", "hi", "ia", "bj", "cj", "ck", "dk", "jk", "kl", "el",
    "fl", "ja", "ji", "kh", "lg", "hm", "mn", "im", "lh",
];

// Favicon sizes: only the outline and the accent node, so it stays a clear shape.
const SIMPLE_EDGES = ["ab", "bc", "cd", "de", "ef", "fg", "gh", "hi", "ia", "hm", "mn", "im"];

export function BrandMark({
    size = 32,
    color = "currentColor",
    accent = "var(--brand-accent, #a9472d)",
    simple = false,
}: {
    size?: number;
    color?: string;
    accent?: string;
    simple?: boolean;
}) {
    const edges = simple ? SIMPLE_EDGES : EDGES;
    const strokeWidth = simple ? 4.4 : 2.6;
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {edges.map((e) => (
                <path
                    key={e}
                    d={`M${NODES[e[0]][0]} ${NODES[e[0]][1]}L${NODES[e[1]][0]} ${NODES[e[1]][1]}`}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
            ))}
            {Object.entries(NODES).map(([key, [x, y]]) => {
                if (simple && "jklmn".includes(key) && key !== "k") return null;
                if (key === "k") return <circle key={key} cx={x} cy={y} r={simple ? 7 : 5.2} fill={accent} />;
                const r = simple ? 4.6 : "abcdefg".includes(key) ? 3.6 : 3;
                return <circle key={key} cx={x} cy={y} r={r} fill={color} />;
            })}
        </svg>
    );
}
