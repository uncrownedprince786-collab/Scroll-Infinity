import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "80px",
          background: "#0b0b0a",
          color: "#fbfaf8",
        }}
      >
        <svg
          width="92"
          height="92"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8aa6ff"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 12C8.2 8.5 3.8 8.5 3.8 12C3.8 15.5 8.2 15.5 11 12C13.6 9.3 16.9 10.4 20.4 12" />
          <path d="M17.9 9.7 20.7 12 17.9 14.3" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 600, letterSpacing: "-0.03em" }}>
            {siteConfig.name}
          </div>
          <div style={{ fontSize: 34, color: "#a6a29a", marginTop: 14 }}>
            {siteConfig.tagline}
          </div>
        </div>
        <div
          style={{
            fontSize: 25,
            color: "#6f6b63",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Source-backed knowledge · Wikipedia + Wikidata
        </div>
      </div>
    ),
    size,
  );
}
