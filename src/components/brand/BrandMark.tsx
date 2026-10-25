// Placeholder mark (branching "J"); replaced once a logo concept is chosen.
// Plain SVG so it also renders inside next/og ImageResponse.
export function BrandMark({
    size = 32,
    color = "currentColor",
    accent = "currentColor",
}: {
    size?: number;
    color?: string;
    accent?: string;
}) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M36 8v34c0 8-5 14-13 14-5 0-9-2-12-6" stroke={color} strokeWidth="5" strokeLinecap="round" />
            <path d="M36 24c6 0 12-4 16-12" stroke={color} strokeWidth="4" strokeLinecap="round" />
            <path d="M36 34c5 0 10-2 14-8" stroke={color} strokeWidth="4" strokeLinecap="round" />
            <circle cx="52" cy="11" r="4" fill={accent} />
            <circle cx="50" cy="25" r="3" fill={accent} />
            <circle cx="36" cy="8" r="3.5" fill={accent} />
        </svg>
    );
}
