import { ImageResponse } from "next/og";

export const alt = "Next Level — Marketing digital, web design și automatizări";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "linear-gradient(130deg, #060a14, #102544)", padding: "72px", color: "white", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#93c5fd" }}>NEXT LEVEL / ADVERTISING AGENCY</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.08 }}>
        <span>Idei bune.</span><span style={{ color: "#60a5fa" }}>Rezultate la alt nivel.</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 23, color: "#cbd5e1" }}>
        <span>Marketing · Web design · SEO · Automatizări</span><span>Zalău, Sălaj</span>
      </div>
    </div>, size,
  );
}
