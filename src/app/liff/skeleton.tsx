/** โครงหน้า (skeleton) สำหรับ LIFF — โชว์ทันทีระหว่างรอ server (ใช้ใน loading.tsx) */

function MenuGroup({ n, twoLine }: { n: number; twoLine?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}
        >
          <div className="h-8 w-8 shrink-0 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded bg-slate-200" />
            {twoLine && <div className="h-3 w-40 rounded bg-slate-100" />}
          </div>
          <div className="h-4 w-10 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

/** โครงหน้าแรก: การ์ดหัว (ยอดค้าง) + สรุปล่าสุด + อื่น ๆ */
export function MenuSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-32 rounded-2xl bg-slate-200" />
      <div className="mb-1.5 mt-5 h-4 w-24 rounded bg-slate-200" />
      <MenuGroup n={3} />
      <div className="mb-1.5 mt-5 h-4 w-16 rounded bg-slate-200" />
      <MenuGroup n={2} twoLine />
    </div>
  );
}

/** หัวหน้าย่อย (ปุ่มกลับ + ชื่อ) */
function SubHeaderSkel() {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-slate-200" />
      <div className="h-6 w-40 rounded bg-slate-200" />
    </div>
  );
}

/** กล่องรายการ (แถวซ้าย-ขวา) */
function RowsSkel({ n = 4 }: { n?: number }) {
  return (
    <div className="divide-y divide-slate-100 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-slate-100">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-3.5">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-4 w-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

/** โครงหน้าย่อยทั่วไป (บิล/ห้อง/พัสดุ/วิธีชำระ/ติดต่อ ฯลฯ) */
export function SubPageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <SubHeaderSkel />
      <div className="space-y-4">
        <RowsSkel n={rows} />
      </div>
    </div>
  );
}
