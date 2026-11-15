import { Suspense } from "react";
import { Placeholder } from "@/app/_components/placeholder";
import { requireStudent } from "@/lib/auth";

async function SiswaHomeContent() {
  await requireStudent();
  return (
    <Placeholder
      title="Beranda"
      description="Ringkasan ruang belajarmu akan tampil di sini."
    />
  );
}

export default function SiswaHomePage() {
  return (
    <Suspense
      fallback={<div className="text-sm text-slate-500">Memuat beranda...</div>}
    >
      <SiswaHomeContent />
    </Suspense>
  );
}
