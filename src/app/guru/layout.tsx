import { Suspense, type ReactNode } from "react";
import { requireTeacher } from "@/lib/auth";
import { TeacherNavigation } from "@/app/guru/navigation";

async function TeacherContent({ children }: { children: ReactNode }) {
  const teacher = await requireTeacher();
  return (
    <>
      <TeacherNavigation name={teacher.name} />
      <main className="min-h-screen px-4 py-6 md:ml-64 md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </>
  );
}

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense
        fallback={
          <div className="p-6 text-sm text-slate-500">Memuat ruang guru...</div>
        }
      >
        <TeacherContent>{children}</TeacherContent>
      </Suspense>
    </div>
  );
}
