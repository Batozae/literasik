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
      <main className="min-h-[calc(100vh-4rem)] px-4 py-6 pb-24 md:ml-64 md:px-8 md:py-6 md:pb-10">
        <div className="mx-auto max-w-6xl">{children}</div>
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
