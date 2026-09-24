import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0a",
        }}
      >
        <svg
          width="118"
          height="118"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fbfaf8"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 12C8.2 8.5 3.8 8.5 3.8 12C3.8 15.5 8.2 15.5 11 12C13.6 9.3 16.9 10.4 20.4 12" />
          <path d="M17.9 9.7 20.7 12 17.9 14.3" />
        </svg>
      </div>
    ),
    size,
  );
}
