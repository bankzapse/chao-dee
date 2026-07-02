import { PageHeader } from "@/components/ui";

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
    icon: "📢",
    title: "เชื่อม LINE กับผู้เช่า",
    steps: [
      "ตั้งค่า LINE Channel ใน .env.local (ดูคู่มือใน README)",
      "ที่เมนู “ผู้เช่า” กด “สร้างรหัสเชื่อม LINE” แล้วส่งรหัสให้ผู้เช่า",
      "ผู้เช่าพิมพ์รหัสใน LINE OA เพื่อผูกบัญชี จากนั้นเช็คยอด/แจ้งซ่อม/รับพัสดุผ่าน LINE ได้",
    ],
  },
  {
    icon: "🤖",
    title: "AI อ่านมิเตอร์",
    steps: [
      "ใส่ ANTHROPIC_API_KEY ใน .env.local",
      "ที่หน้าจดมิเตอร์ กดปุ่ม 📷 ข้างช่องกรอก แล้วถ่าย/เลือกรูปหน้าปัดมิเตอร์",
      "ระบบจะอ่านตัวเลขให้อัตโนมัติ พร้อมเตือนหากค่าผิดปกติ",
    ],
  },
];

const FAQ = [
  {
    q: "ข้อมูลของแต่ละหอแยกกันไหม?",
    a: "แยกกันสมบูรณ์ ระบบใช้ Row Level Security แต่ละบัญชี/องค์กรเห็นเฉพาะข้อมูลของตัวเอง",
  },
  {
    q: "ผู้เช่าต้องโหลดแอปไหม?",
    a: "ไม่ต้อง ผู้เช่าใช้งานผ่าน LINE OA ได้เลย ส่วนเจ้าของ/แอดมินใช้เว็บและแอปมือถือ",
  },
  {
    q: "รองรับกี่อาคาร/ห้อง/ผู้เช่า?",
    a: "ไม่จำกัด ทั้งอาคาร ห้องพัก ผู้เช่า และสัญญา",
  },
];

export default function HelpPage() {
  return (
    <div>
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

      <div className="mt-8 rounded-xl bg-indigo-600 p-6 text-white">
        <h2 className="text-lg font-semibold">ต้องการความช่วยเหลือเพิ่มเติม?</h2>
        <p className="mt-1 text-sm text-indigo-100">
          ทีมงานพร้อมให้คำปรึกษาการใช้งานและการตั้งค่าระบบ
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="mailto:support@chaodee.app"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            ✉️ อีเมลทีมงาน
          </a>
          <a
            href="https://line.me"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            💬 แชทผ่าน LINE
          </a>
        </div>
      </div>
    </div>
  );
}
