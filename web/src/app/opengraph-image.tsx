import { ImageResponse } from "next/og";

export const alt = "SourceLens — every visit has an origin. See all of them.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const accent = "#c8f751";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#08090a",
          color: "#edeff3",
          padding: 72,
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -180,
            width: 820,
            height: 820,
            borderRadius: 410,
            background: `radial-gradient(circle, ${accent}2b 0%, transparent 68%)`,
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 13, height: 13, borderRadius: 7, background: "#0f1305", display: "flex" }} />
          </div>
          <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: -0.8 }}>SourceLens</div>
          <div
            style={{
              marginLeft: 8,
              border: "1px solid #2a3038",
              borderRadius: 6,
              padding: "4px 9px",
              fontSize: 14,
              color: "#99a1ac",
            }}
          >
            v1.0
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              border: `1px solid ${accent}55`,
              background: `${accent}18`,
              borderRadius: 999,
              padding: "8px 18px",
              fontSize: 17,
              color: accent,
            }}
          >
            Traffic source intelligence · SEO · AEO · GEO
          </div>
          <div style={{ fontSize: 68, lineHeight: 1.06, fontWeight: 700, letterSpacing: -3.4, display: "flex", flexDirection: "column" }}>
            <span>Every visit has an origin.</span>
            <span style={{ color: accent }}>See all of them.</span>
          </div>
          <div style={{ fontSize: 24, color: "#99a1ac", lineHeight: 1.4, maxWidth: 940 }}>
            Know exactly where your traffic comes from — and turn that signal into growth.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 16, color: "#67707c" }}>
          <span>ChatGPT</span>
          <span>Perplexity</span>
          <span>Google</span>
          <span>Claude</span>
          <span>Reddit</span>
          <span style={{ marginLeft: "auto", color: accent }}>sourcelens.app</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
