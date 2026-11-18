export default function StudentLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat halaman">
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200/80" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-slate-200/80" />
          <div className="h-4 w-72 max-w-full rounded-lg bg-slate-200/60" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-white" />
        <div className="h-24 rounded-xl bg-white" />
        <div className="h-24 rounded-xl bg-white" />
      </div>
      <div className="h-64 rounded-xl bg-white" />
    </div>
  );
}

