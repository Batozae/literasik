import { Clock } from "lucide-react";

export function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
        <p className="text-sm text-slate-600 md:text-base">{description}</p>
      </header>
      <div className="relative overflow-hidden rounded-2xl bg-white p-8 text-center">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1.5 bg-indigo-600"
        />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <Clock className="h-6 w-6" />
        </div>
        <p className="mt-3 font-semibold text-slate-900">Segera hadir</p>
        <p className="mt-1 text-sm text-slate-500">
          Fitur ini sedang disiapkan untuk tahap berikutnya.
        </p>
      </div>
    </section>
  );
}
