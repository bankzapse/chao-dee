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
const TENANT_BUTTONS = [
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
// เมนูสำหรับ "เจ้าของหอ" (ผูกรายบุคคลตอนเชื่อมบัญชีเจ้าของ) — ปุ่มส่งคำสั่งแชท + เปิดเว็บ
const OWNER_BUTTONS = [
  {
    label: "งานซ่อมค้าง",
    sub: "รอดำเนินการ",
    text: "owner-maint",
    img: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=560&q=42",
    overlay: "linear-gradient(160deg, rgba(217,119,6,0.55) 0%, rgba(120,53,15,0.88) 100%)",
    icon: ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
  },
  {
    label: "ค้างชำระ",
    sub: "ยอดที่ผู้เช่าค้าง",
    text: "owner-debt",
    img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=560&q=42",
    overlay: "linear-gradient(160deg, rgba(225,29,72,0.55) 0%, rgba(76,5,25,0.9) 100%)",
    icon: ["M2 6h20v12H2z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M6 12h.01", "M18 12h.01"],
  },
  {
    label: "สรุปหอ",
    sub: "เข้าพัก · รายได้",
    text: "owner-summary",
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=560&q=42",
    overlay: "linear-gradient(160deg, rgba(79,70,229,0.55) 0%, rgba(30,27,75,0.88) 100%)",
    icon: ["M3 3v18h18", "M7 16v-5", "M12 16V8", "M17 16v-9"],
  },
  {
    label: "เปิดเว็บจัดการ",
    sub: "จัดการทั้งหมด",
    text: "owner-web",
    img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=560&q=42",
    overlay: "linear-gradient(160deg, rgba(124,58,237,0.55) 0%, rgba(46,16,101,0.9) 100%)",
    icon: ["M3 4h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z", "M8 20h8", "M12 16v4"],
  },
];
type LineArea = { type: "uri"; uri: string } | { type: "message"; text: string };
// ข้อความที่ส่งเมื่อกด ต้องตรงกับ label ของปุ่ม (OWNER_BUTTONS) และตรงกับที่ handleOwner จับ
// — "งานซ่อมค้าง" มี "ซ่อม", "สรุปหอ" มี "สรุป" → webhook match ได้ (กันสับสน/ชนคำสั่งผู้เช่า)
const OWNER_ACTIONS: LineArea[] = [
  { type: "message", text: "งานซ่อมค้าง" },
  { type: "message", text: "ค้างชำระ" },
  { type: "message", text: "สรุปหอ" },
  { type: "uri", uri: "https://www.chao-dee.com/dashboard" },
];

const W = 1200;
const H = 810;
const COLS = 2;
const ROWS = 2;
const CW = W / COLS;
const CH = H / ROWS;

/** รูปเมนู — แต่ละช่อง: รูปพื้นหลัง + overlay ไล่สี + ไอคอนเส้นในวงกระจก + ตัวใหญ่ + คำอธิบาย */
type MenuButton = { label: string; sub: string; text: string; img: string; overlay: string; icon: string[] };
function menuImage(buttons: MenuButton[]) {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexWrap: "wrap", width: W, height: H, background: "#0f172a" }}>
        {buttons.map((b) => (
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
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  const owner = new URL(req.url).searchParams.get("menu") === "owner";
  return menuImage(owner ? OWNER_BUTTONS : TENANT_BUTTONS);
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

  // helper: สร้างเมนู 1 อัน (object → อัปโหลดรูป → set default ถ้าใช่) คืน richMenuId
  async function createMenu(
    name: string,
    chatBarText: string,
    buttons: MenuButton[],
    actions: LineArea[],
    setDefault: boolean
  ) {
    const richmenu = {
      size: { width: W, height: H },
      selected: setDefault,
      name,
      chatBarText,
      areas: buttons.map((_, i) => ({
        bounds: {
          x: Math.round((i % COLS) * CW),
          y: Math.round(Math.floor(i / COLS) * CH),
          width: Math.round(CW),
          height: Math.round(CH),
        },
        action: actions[i],
      })),
    };
    const createRes = await fetch(`${LINE_API}/richmenu`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(richmenu),
    });
    if (!createRes.ok) throw new Error("สร้าง rich menu ไม่สำเร็จ: " + (await createRes.text()));
    const { richMenuId } = (await createRes.json()) as { richMenuId: string };

    const imgBytes = new Uint8Array(await menuImage(buttons).arrayBuffer());
    const uploadRes = await fetch(`${LINE_DATA_API}/richmenu/${richMenuId}/content`, {
      method: "POST",
      headers: { "Content-Type": "image/png", Authorization: `Bearer ${token}` },
      body: imgBytes,
    });
    if (!uploadRes.ok) throw new Error("อัปโหลดรูปเมนูไม่สำเร็จ: " + (await uploadRes.text()));

    if (setDefault) {
      const defRes = await fetch(`${LINE_API}/user/all/richmenu/${richMenuId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!defRes.ok) throw new Error("ตั้งเมนูเริ่มต้นไม่สำเร็จ: " + (await defRes.text()));
    }
    return richMenuId;
  }

  // tenant: เปิด LIFF (path "" = หน้าแรก) ไม่งั้นส่งข้อความ · owner: ตาม OWNER_ACTIONS
  const tenantActions: LineArea[] = TENANT_BUTTONS.map((b) =>
    liffId ? { type: "uri", uri: `https://liff.line.me/${liffId}${b.path}` } : { type: "message", text: b.text }
  );

  try {
    // เมนูผู้เช่า = default ทุกคน · เมนูเจ้าของ = ผูกรายบุคคลตอนเชื่อมบัญชี (ชื่อ "Chao-Dee Owner")
    const tenantRichMenuId = await createMenu("Chao-Dee Menu", "เมนู Chao-Dee", TENANT_BUTTONS, tenantActions, true);
    const ownerRichMenuId = await createMenu("Chao-Dee Owner", "เมนูเจ้าของหอ", OWNER_BUTTONS, OWNER_ACTIONS, false);
    return NextResponse.json({ ok: true, tenantRichMenuId, ownerRichMenuId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
