import { Suspense } from "react";
import { Placeholder } from "@/app/_components/placeholder";
import { requireTeacher } from "@/lib/auth";

async function TeacherDashboardContent() {
  await requireTeacher();
  return (
    <Placeholder
      title="Dasbor Guru"
      description="Ringkasan asesmen dan kelas yang kamu ajar akan tampil di sini."
    />
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense
      fallback={<div className="text-sm text-slate-500">Memuat dasbor...</div>}
    >
      <TeacherDashboardContent />
    </Suspense>
  );
}
