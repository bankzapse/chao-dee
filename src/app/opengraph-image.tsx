import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Chao-Dee — ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 26,
              background: "rgba(255,255,255,0.16)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <div style={{ fontSize: 34, lineHeight: 1, letterSpacing: -2 }}>⌂</div>
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -3, marginTop: -6 }}>CD</div>
          </div>
          <div style={{ fontSize: 64, fontWeight: 800 }}>Chao-Dee · เช่าดี</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 44, fontWeight: 700, lineHeight: 1.2 }}>
          ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์ ครบวงจร
        </div>
        <div style={{ marginTop: 24, fontSize: 30, opacity: 0.9 }}>
          ออกบิลอัตโนมัติ · จดมิเตอร์ด้วย AI · แจ้งเตือนผ่าน LINE
        </div>
        <div style={{ marginTop: 48, fontSize: 26, opacity: 0.85 }}>
          ทดลองใช้ฟรี 30 วัน · chao-dee.com
        </div>
      </div>
    ),
    size
  );
}
