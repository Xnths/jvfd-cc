import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand/BrandMark";
import { brand } from "@/lib/brand";

// Shared renderer for every Open Graph card. Fonts and the portrait are read
// from disk (no network at build time); next.config.mjs adds them to the
// standalone output trace so on-demand cards work in production too.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const root = process.cwd();

async function loadAssets() {
    const [serif, sans, sansBold, portrait] = await Promise.all([
        readFile(join(root, "src/assets/fonts/Fraunces-SemiBold.woff")),
        readFile(join(root, "src/assets/fonts/Inter-Regular.woff")),
        readFile(join(root, "src/assets/fonts/Inter-SemiBold.woff")),
        readFile(join(root, "public/jv.jpeg")),
    ]);
    return {
        fonts: [
            { name: "Fraunces", data: serif, weight: 600 as const, style: "normal" as const },
            { name: "Inter", data: sans, weight: 400 as const, style: "normal" as const },
            { name: "Inter", data: sansBold, weight: 600 as const, style: "normal" as const },
        ],
        portrait: `data:image/jpeg;base64,${portrait.toString("base64")}`,
    };
}

type OgCardInput = {
    eyebrow: string;
    title: string;
    footer?: string;
    /** Show João's portrait on the right (default cards); text-only for articles */
    portrait?: boolean;
};

export async function renderOgCard({
    eyebrow,
    title,
    footer = "CRP 06/157908 · Online para todo o Brasil · Presencial na Vila Madalena, SP",
    portrait = false,
}: OgCardInput) {
    const assets = await loadAssets();
    const titleSize = title.length > 70 ? 52 : title.length > 40 ? 60 : 72;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    backgroundColor: brand.colors.paper,
                    fontFamily: "Inter",
                }}
            >
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "64px 72px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <BrandMark size={56} color={brand.colors.forest} accent={brand.colors.clay} />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontFamily: "Fraunces", fontSize: 30, color: brand.colors.forest }}>
                                João Fernandes
                            </span>
                            <span style={{ fontSize: 18, color: brand.colors.moss, letterSpacing: 2 }}>
                                PSICOLOGIA · ANÁLISE DO COMPORTAMENTO
                            </span>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <span
                            style={{
                                fontSize: 22,
                                fontWeight: 600,
                                color: brand.colors.clay,
                                textTransform: "uppercase",
                                letterSpacing: 3,
                            }}
                        >
                            {eyebrow}
                        </span>
                        <span
                            style={{
                                fontFamily: "Fraunces",
                                fontSize: titleSize,
                                lineHeight: 1.1,
                                color: brand.colors.ink,
                                maxWidth: portrait ? 640 : 1000,
                            }}
                        >
                            {title}
                        </span>
                    </div>

                    <span style={{ fontSize: 20, color: brand.colors.moss }}>{footer}</span>
                </div>

                {portrait && (
                    <div style={{ display: "flex", width: 400, height: "100%", position: "relative" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={assets.portrait}
                            alt=""
                            width={400}
                            height={630}
                            style={{ width: 400, height: 630, objectFit: "cover" }}
                        />
                    </div>
                )}

                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        bottom: 0,
                        width: "100%",
                        height: 10,
                        display: "flex",
                        backgroundColor: brand.colors.forest,
                    }}
                />
            </div>
        ),
        { ...OG_SIZE, fonts: assets.fonts },
    );
}
