export default function LoadingQuestions() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Bank Soal</h1>
      <p className="text-sm text-slate-600">Memuat bank soal...</p>
      <div className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
