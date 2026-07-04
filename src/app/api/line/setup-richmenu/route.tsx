import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { lineToken, isLineConfigured } from "@/lib/line";

export const runtime = "nodejs";

const LINE_API = "https://api.line.me/v2/bot";
const LINE_DATA_API = "https://api-data.line.me/v2/bot";

// 6 ปุ่ม (2 แถว x 3 คอลัมน์, 2500x1686) → ส่งข้อความให้ webhook ประมวลผล
const BUTTONS = [
  { label: "บิล / ยอดค้าง", emoji: "🧾", text: "บิล", bg: "#6366f1" },
  { label: "แจ้งซ่อม", emoji: "🔧", text: "แจ้งซ่อม", bg: "#f59e0b" },
  { label: "พัสดุ", emoji: "📦", text: "พัสดุ", bg: "#10b981" },
  { label: "ข้อมูลห้อง", emoji: "🏠", text: "ข้อมูลห้อง", bg: "#06b6d4" },
  { label: "วิธีชำระเงิน", emoji: "💳", text: "ชำระเงิน", bg: "#8b5cf6" },
  { label: "ติดต่อผู้ดูแล", emoji: "☎️", text: "ติดต่อ", bg: "#f43f5e" },
];
const W = 2500;
const H = 1686;
const COLS = 3;
const ROWS = 2;
const CW = W / COLS;
const CH = H / ROWS;

/** รูปเมนู (glass cards บนพื้น gradient) */
function menuImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          width: W,
          height: H,
          backgroundImage: "linear-gradient(135deg, #4338ca 0%, #4f46e5 45%, #0e7490 100%)",
        }}
      >
        {BUTTONS.map((b) => (
          <div
            key={b.text}
            style={{ width: CW, height: CH, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div
              style={{
                width: CW - 72,
                height: CH - 72,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 30,
                borderRadius: 48,
                background: "rgba(255,255,255,0.10)",
                border: "2px solid rgba(255,255,255,0.22)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 190,
                  height: 190,
                  borderRadius: 999,
                  background: b.bg,
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 104,
                }}
              >
                {b.emoji}
              </div>
              <div style={{ fontSize: 62, fontWeight: 700, color: "white" }}>{b.label}</div>
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
    name: "ChaoDee Menu",
    chatBarText: "เมนู ChaoDee",
    areas: BUTTONS.map((b, i) => ({
      bounds: {
        x: Math.round((i % COLS) * CW),
        y: Math.round(Math.floor(i / COLS) * CH),
        width: Math.round(CW),
        height: Math.round(CH),
      },
      action: { type: "message", text: b.text },
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
