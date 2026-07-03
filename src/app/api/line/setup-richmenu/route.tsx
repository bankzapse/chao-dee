import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { lineToken, isLineConfigured } from "@/lib/line";

export const runtime = "nodejs";

const LINE_API = "https://api.line.me/v2/bot";
const LINE_DATA_API = "https://api-data.line.me/v2/bot";

// 4 ปุ่ม (2500x843) → ส่งเป็นข้อความให้ webhook ประมวลผล
const BUTTONS = [
  { label: "บิล/ยอดค้าง", emoji: "🧾", text: "บิล" },
  { label: "แจ้งซ่อม", emoji: "🔧", text: "แจ้งซ่อม" },
  { label: "พัสดุ", emoji: "📦", text: "พัสดุ" },
  { label: "ข้อมูลห้อง", emoji: "🚪", text: "ข้อมูลห้อง" },
];
const W = 2500;
const H = 843;
const COL = W / BUTTONS.length;

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

  // 1) สร้าง rich menu object
  const richmenu = {
    size: { width: W, height: H },
    selected: true,
    name: "ChaoDee Menu",
    chatBarText: "เมนู ChaoDee",
    areas: BUTTONS.map((b, i) => ({
      bounds: { x: Math.round(i * COL), y: 0, width: Math.round(COL), height: H },
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

  // 2) สร้างรูปเมนูด้วย ImageResponse แล้วอัปโหลด
  const img = new ImageResponse(
    (
      <div style={{ display: "flex", width: W, height: H, background: "#4f46e5" }}>
        {BUTTONS.map((b, i) => (
          <div
            key={b.text}
            style={{
              width: COL,
              height: H,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              color: "white",
              borderRight: i < BUTTONS.length - 1 ? "2px solid rgba(255,255,255,0.25)" : "none",
            }}
          >
            <div style={{ fontSize: 150 }}>{b.emoji}</div>
            <div style={{ fontSize: 60, fontWeight: 700 }}>{b.label}</div>
          </div>
        ))}
      </div>
    ),
    { width: W, height: H }
  );
  const imgBytes = new Uint8Array(await img.arrayBuffer());

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
