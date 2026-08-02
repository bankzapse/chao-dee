import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { lineToken, isLineConfigured } from "@/lib/line";

export const runtime = "nodejs";

const LINE_API = "https://api.line.me/v2/bot";
const LINE_DATA_API = "https://api-data.line.me/v2/bot";

// 4 ปุ่ม (2 แถว x 2 คอลัมน์) — พื้นหลังรูปภาพ + overlay ไล่สี + ไอคอนเส้น
// path "" = เปิดหน้าแรก LIFF (/liff) ที่มี tab bar · path "/x" = เปิด LIFF หน้านั้นตรง ๆ
// (ข้อมูลห้อง/วิธีชำระ/ติดต่อ เข้าถึงได้จาก tab bar + แดชบอร์ดหน้าแรกแล้ว จึงไม่ต้องมีใน rich menu)
const BUTTONS = [
  {
    label: "หน้าแรก",
    sub: "แดชบอร์ด · เมนูผู้เช่า",
    path: "", // → https://liff.line.me/{id} = เปิด /liff (แดชบอร์ด + tab bar)
    text: "หน้าแรก",
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=560&q=42",
    overlay: "linear-gradient(160deg, rgba(124,58,237,0.55) 0%, rgba(46,16,101,0.9) 100%)",
    icon: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
  },
  {
    label: "บิล / ยอดค้าง",
    sub: "ใบแจ้งหนี้ · ชำระเงิน",
    path: "/bills",
    text: "บิล",
    img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=560&q=42",
    overlay: "linear-gradient(160deg, rgba(79,70,229,0.55) 0%, rgba(30,27,75,0.88) 100%)",
    icon: ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v5h5", "M16 13H8", "M16 17H8", "M10 9H8"],
  },
  {
    label: "แจ้งซ่อม",
    sub: "แจ้งปัญหา · แนบรูป",
    path: "/maintenance",
    text: "แจ้งซ่อม",
    img: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=560&q=42",
    overlay: "linear-gradient(160deg, rgba(217,119,6,0.55) 0%, rgba(120,53,15,0.88) 100%)",
    icon: ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
  },
  {
    label: "พัสดุ",
    sub: "พัสดุที่มาถึงหอ",
    path: "/parcels",
    text: "พัสดุ",
    img: "https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?auto=format&fit=crop&w=560&q=42",
    overlay: "linear-gradient(160deg, rgba(5,150,105,0.55) 0%, rgba(6,78,59,0.88) 100%)",
    icon: ["M7.5 4.27l9 5.15", "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z", "M3.3 7l8.7 5 8.7-5", "M12 22V12"],
  },
];
const W = 1200;
const H = 810;
const COLS = 2;
const ROWS = 2;
const CW = W / COLS;
const CH = H / ROWS;

/** รูปเมนู — แต่ละช่อง: รูปพื้นหลัง + overlay ไล่สี + ไอคอนเส้นในวงกระจก + ตัวใหญ่ + คำอธิบาย */
function menuImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexWrap: "wrap", width: W, height: H, background: "#0f172a" }}>
        {BUTTONS.map((b) => (
          <div key={b.text} style={{ width: CW, height: CH, display: "flex", padding: 8 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                borderRadius: 24,
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.img}
                width={CW}
                height={CH}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                alt=""
              />
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: b.overlay }} />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 84,
                    height: 84,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.16)",
                    border: "2px solid rgba(255,255,255,0.55)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width={46}
                    height={46}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {b.icon.map((d, i) => (
                      <path key={i} d={d} />
                    ))}
                  </svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: "white" }}>{b.label}</div>
                  <div style={{ fontSize: 22, color: "rgba(255,255,255,0.92)" }}>{b.sub}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    { width: W, height: H }
  );
}

/** ดูตัวอย่างรูปเมนู (เฉพาะ dev — กันยิงถี่เปลือง CPU บน production) */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  return menuImage();
}

/** ตั้งค่า Rich Menu ของ LINE OA — ต้องเป็นแอดมินแพลตฟอร์ม หรือแนบ Bearer CRON_SECRET */
export async function POST(req: Request) {
  // auth
  const cron = process.env.CRON_SECRET;
  const authed =
    cron && req.headers.get("authorization") === `Bearer ${cron}`;
  if (!authed) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!data?.is_platform_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!isLineConfigured()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า LINE (LINE_CHANNEL_ACCESS_TOKEN)" }, { status: 400 });
  }
  const token = lineToken();
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

  // 0) ลบ rich menu เก่าทั้งหมด (กันสะสมตอนรันซ้ำ)
  try {
    const listRes = await fetch(`${LINE_API}/richmenu/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.ok) {
      const { richmenus } = (await listRes.json()) as { richmenus: { richMenuId: string }[] };
      await Promise.all(
        (richmenus ?? []).map((r) =>
          fetch(`${LINE_API}/richmenu/${r.richMenuId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
    }
  } catch {
    /* best-effort */
  }

  // 1) สร้าง rich menu object
  const richmenu = {
    size: { width: W, height: H },
    selected: true,
    name: "Chao-Dee Menu",
    chatBarText: "เมนู Chao-Dee",
    areas: BUTTONS.map((b, i) => ({
      bounds: {
        x: Math.round((i % COLS) * CW),
        y: Math.round(Math.floor(i / COLS) * CH),
        width: Math.round(CW),
        height: Math.round(CH),
      },
      // เปิด LIFF ถ้าตั้งค่า LIFF ID ไว้ (path "" = หน้าแรก /liff) ไม่งั้นถอยไปส่งข้อความ
      action: liffId
        ? { type: "uri", uri: `https://liff.line.me/${liffId}${b.path}` }
        : { type: "message", text: b.text },
    })),
  };
  const createRes = await fetch(`${LINE_API}/richmenu`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(richmenu),
  });
  if (!createRes.ok) {
    return NextResponse.json({ error: "สร้าง rich menu ไม่สำเร็จ", detail: await createRes.text() }, { status: 502 });
  }
  const { richMenuId } = (await createRes.json()) as { richMenuId: string };

  // 2) สร้างรูปเมนู แล้วอัปโหลด
  const imgBytes = new Uint8Array(await menuImage().arrayBuffer());

  const uploadRes = await fetch(`${LINE_DATA_API}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { "Content-Type": "image/png", Authorization: `Bearer ${token}` },
    body: imgBytes,
  });
  if (!uploadRes.ok) {
    return NextResponse.json({ error: "อัปโหลดรูปเมนูไม่สำเร็จ", detail: await uploadRes.text() }, { status: 502 });
  }

  // 3) ตั้งเป็นเมนูเริ่มต้นของทุกผู้ใช้
  const defRes = await fetch(`${LINE_API}/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!defRes.ok) {
    return NextResponse.json({ error: "ตั้งเมนูเริ่มต้นไม่สำเร็จ", detail: await defRes.text() }, { status: 502 });
  }

  return NextResponse.json({ ok: true, richMenuId });
}
