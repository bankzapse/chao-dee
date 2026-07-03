// แสดงทันทีระหว่างโหลดหน้าใหม่ — ทำให้การเปลี่ยนเมนูรู้สึกไว
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-64 rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="p-5">
              <div className="h-10 w-10 rounded-xl bg-slate-200" />
              <div className="mt-3 h-3 w-20 rounded bg-slate-100" />
              <div className="mt-2 h-6 w-24 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-slate-200/70 bg-white shadow-sm" />
    </div>
  );
}
