import { PageHeader } from "@/components/ui";
import { COMPANY } from "@/lib/company";

const GUIDES = [
  {
    icon: "🏢",
    title: "เริ่มต้นใช้งาน",
    steps: [
      "เพิ่มอาคารที่เมนู “อาคาร”",
      "เพิ่มห้องพักพร้อมกำหนดค่าเช่า/ค่าน้ำ/ค่าไฟต่อหน่วย",
      "เพิ่มผู้เช่า แล้วทำสัญญาเช่าเพื่อผูกผู้เช่ากับห้อง",
    ],
  },
  {
    icon: "🧾",
    title: "ออกบิลรายเดือน",
    steps: [
      "ไปเมนู “จดมิเตอร์” เลือกรอบเดือน แล้วกรอกเลขมิเตอร์ (หรือกด 📷 ให้ AI อ่านให้)",
      "ไปเมนู “บิล/ใบแจ้งหนี้” เลือกรอบเดือน แล้วกด “ออกบิลรอบนี้”",
      "เปิดบิลเพื่อพิมพ์ PDF, ส่งผ่าน LINE, หรือบันทึกการชำระเงิน",
    ],
  },
  {
    icon: "💬",
    title: "เชื่อม LINE กับผู้เช่า",
    steps: [
      "ที่เมนู “ผู้เช่า” เลือกผู้เช่า แล้วกด “เชื่อม LINE” จะได้รหัส 6 หลัก",
      "ให้ผู้เช่าแอด LINE OA “Chao-Dee” เป็นเพื่อน",
      "ผู้เช่าพิมพ์ “รหัส” หรือ “เบอร์โทรที่ลงทะเบียนไว้” ในแชต OA เพื่อผูกบัญชี — จากนั้นเช็คยอด/แจ้งซ่อม/รับพัสดุผ่าน LINE ได้เลย",
    ],
  },
  {
    icon: "🤖",
    title: "AI อ่านมิเตอร์",
    steps: [
      "ที่หน้า “จดมิเตอร์” กดปุ่ม 📷 ข้างช่องกรอกเลขมิเตอร์",
      "ถ่ายรูปหรือเลือกรูปหน้าปัดมิเตอร์",
      "ระบบอ่านตัวเลขให้อัตโนมัติ พร้อมเตือนหากค่าผิดปกติ — ตรวจสอบแล้วกดบันทึกได้เลย",
    ],
  },
  {
    icon: "🔔",
    title: "รับแจ้งเตือนแจ้งซ่อมทาง LINE",
    steps: [
      "ไปเมนู “ตั้งค่า” → การ์ด “แจ้งเตือนผ่าน LINE (เจ้าของหอ)” กด “สร้างรหัสเชื่อม”",
      "แอด LINE OA “Chao-Dee” แล้วส่งรหัสนั้นในแชต",
      "เมื่อผู้เช่าแจ้งซ่อมผ่าน LINE คุณจะได้รับแจ้งเตือนเข้ามือถือทันที",
    ],
  },
  {
    icon: "🎫",
    title: "ต่ออายุ & ใบเสร็จ",
    steps: [
      "ไปเมนู “ตั้งค่า” → “ต่ออายุ/อัปเกรด” เลือกแพ็คเกจและรอบการชำระ",
      "สแกน PromptPay จ่ายเงิน แล้วแนบสลิป",
      "เมื่อทีมงานยืนยัน ระบบเปิดสิทธิ์ต่อและออกใบเสร็จให้ดาวน์โหลด/พิมพ์",
    ],
  },
];

const FAQ = [
  {
    q: "รองรับกี่อาคาร/ห้อง/ผู้เช่า?",
    a: "ขึ้นกับแพ็คเกจ — Plus: 4 อาคาร / 100 ห้อง / 100 ผู้เช่า, Pro: 10 อาคาร / 300 ห้อง / 300 ผู้เช่า, Exclusive: ไม่จำกัด (ติดต่อทีมงาน)",
  },
  {
    q: "ข้อมูลของแต่ละหอแยกกันไหม?",
    a: "แยกกันสมบูรณ์ ระบบใช้ Row Level Security แต่ละบัญชีเห็นเฉพาะข้อมูลของตัวเอง",
  },
  {
    q: "ผู้เช่าต้องโหลดแอปไหม?",
    a: "ไม่ต้อง ผู้เช่าใช้งานผ่าน LINE OA ได้เลย — เช็คยอด แจ้งซ่อม รับพัสดุ ผ่านเมนูใน LINE",
  },
  {
    q: "ลืมรหัสผ่านทำอย่างไร?",
    a: "ที่หน้าเข้าสู่ระบบ กด “ลืมรหัสผ่าน” แล้วยืนยันด้วยรหัส OTP ที่ส่งไปยังเบอร์โทร เพื่อตั้งรหัสใหม่",
  },
  {
    q: "เปลี่ยน/อัปเกรดแพ็คเกจได้ไหม?",
    a: "ได้ ไปที่ “ตั้งค่า → ต่ออายุ/อัปเกรด” เลือกแพ็คเกจที่ต้องการได้ตลอดเวลา",
  },
];

export default function HelpPage() {
  const lineUrl = process.env.NEXT_PUBLIC_SUPPORT_LINE_URL || "";
  return (
    <div className="animate-in">
      <PageHeader
        title="ช่วยเหลือ & คำปรึกษา"
        subtitle="คู่มือการใช้งานและช่องทางติดต่อทีมงาน"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {GUIDES.map((g) => (
          <div key={g.title} className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">
              {g.icon} {g.title}
            </h2>
            <ol className="space-y-2">
              {g.steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">คำถามที่พบบ่อย</h2>
      <div className="card divide-y divide-slate-100">
        {FAQ.map((f) => (
          <div key={f.q} className="p-5">
            <p className="font-medium text-slate-900">{f.q}</p>
            <p className="mt-1 text-sm text-slate-600">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 p-6 text-white shadow-lg shadow-indigo-500/20">
        <h2 className="text-lg font-semibold">ต้องการความช่วยเหลือเพิ่มเติม?</h2>
        <p className="mt-1 text-sm text-indigo-100">
          ทีมงาน Chao-Dee พร้อมให้คำปรึกษาการใช้งาน (จันทร์–เสาร์ 9:00–18:00)
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`mailto:${COMPANY.email}`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            ✉️ {COMPANY.email}
          </a>
          {lineUrl && (
            <a
              href={lineUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              💬 แชทผ่าน LINE OA
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
