import { Suspense, type ReactNode } from "react";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeacherNavigation } from "@/app/guru/navigation";

async function TeacherContent({ children }: { children: ReactNode }) {
  const teacher = await requireTeacher();
  const assignments = await prisma.teacherClass.findMany({
    where: { teacherId: teacher.id },
    include: { class: { select: { name: true } } },
    orderBy: { class: { name: "asc" } },
  });
  const classNames = assignments.map((a) => a.class.name);

  return (
    <>
      <TeacherNavigation name={teacher.name} classNames={classNames} />
      <main className="min-h-[calc(100vh-4rem)] px-4 py-6 md:ml-64 md:px-8 md:py-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </>
  );
}

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
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
