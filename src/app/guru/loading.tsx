export default function TeacherLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat halaman">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-xl bg-slate-200/80" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-slate-200/60" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 rounded-xl bg-white" />
        <div className="h-24 rounded-xl bg-white" />
        <div className="h-24 rounded-xl bg-white" />
        <div className="h-24 rounded-xl bg-white" />
      </div>
      <div className="h-72 rounded-xl bg-white" />
    </div>
  );
}

