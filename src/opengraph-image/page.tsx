import { siteConfig } from "@/lib/config";
import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    backgroundColor: "#020617",
                }}
            >
                <img
                    src={`${siteConfig.url}/main.jpeg`}
                    style={{
                        width: "40%",
                        objectFit: "cover",
                    }}
                />

                <div
                    style={{
                        flex: 1,
                        padding: "64px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        color: "white",
                        gap: "20px",
                    }}
                >
                    <span style={{ fontSize: 26, opacity: 0.7 }}>
                        Psicólogo Analítico-Comportamental
                    </span>

                    <h1 style={{ fontSize: 56 }}>
                        João Vitor Fernandes
                    </h1>

                    <span style={{ fontSize: 30 }}>
                        Vila Madalena · SP
                    </span>
                </div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}
