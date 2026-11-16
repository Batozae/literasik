export function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
        <p className="text-base text-slate-600">{description}</p>
      </header>
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-8">
        <p className="font-medium text-slate-900">Segera hadir</p>
      </div>
    </section>
  );
}
