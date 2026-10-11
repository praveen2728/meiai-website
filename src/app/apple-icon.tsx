import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 40, background: "#173629", color: "#f2f4f0", fontFamily: "Arial, sans-serif", fontSize: 120, fontWeight: 700, letterSpacing: -12 }}>
      m<span style={{ display: "flex", alignSelf: "flex-end", marginBottom: 30, color: "#9bc8b1", fontSize: 70 }}>.</span>
    </div>,
    size,
  );
}
