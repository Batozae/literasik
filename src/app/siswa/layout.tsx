import { Suspense, type ReactNode } from "react";
import { requireStudent } from "@/lib/auth";
import { StudentNavigation } from "@/app/siswa/navigation";

async function StudentContent({ children }: { children: ReactNode }) {
  const student = await requireStudent();
  return (
    <>
      <StudentNavigation name={student.name} />
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-2xl px-4 py-6 pb-36 md:px-8 md:py-8 md:pb-8">
        {children}
      </main>
    </>
  );
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500">
          Memuat ruang belajar...
        </div>
      }
    >
      <StudentContent>{children}</StudentContent>
    </Suspense>
  );
}
