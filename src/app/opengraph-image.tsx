import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ChaoDee — ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์";
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
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
              fontWeight: 700,
            }}
          >
            ช
          </div>
          <div style={{ fontSize: 64, fontWeight: 800 }}>ChaoDee · เช่าดี</div>
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
