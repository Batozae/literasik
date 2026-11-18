import { Suspense, type ReactNode } from "react";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudentNavigation } from "@/app/siswa/navigation";

async function StudentContent({ children }: { children: ReactNode }) {
  const student = await requireStudent();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
    include: { class: { select: { name: true, gradeLevel: true } } },
  });

  return (
    <>
      <StudentNavigation
        name={student.name}
        classNameLabel={profile?.class.name}
        gradeLevel={profile?.class.gradeLevel}
      />
      <main className="min-h-[calc(100vh-4rem)] px-3 py-4 pb-24 sm:px-4 md:ml-64 md:px-6 md:py-4 md:pb-8 xl:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </>
  );
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Suspense
        fallback={
          <div className="p-6 text-sm text-slate-500">
            Memuat ruang belajar...
          </div>
        }
      >
        <StudentContent>{children}</StudentContent>
      </Suspense>
    </div>
  );
}
