export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-28 rounded-2xl bg-slate-200/70" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-200/70 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-slate-200/70 bg-white shadow-sm" />
    </div>
  );
}
