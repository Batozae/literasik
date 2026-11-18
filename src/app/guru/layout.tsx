import { Suspense, type ReactNode } from "react";
import { requireTeacher } from "@/lib/auth";
import { getTeacherClasses } from "@/lib/teacher-scope";
import { TeacherNavigation } from "@/app/guru/navigation";
import TeacherLoading from "@/app/guru/loading";

async function TeacherContent({ children }: { children: ReactNode }) {
  const teacher = await requireTeacher();
  const classes = await getTeacherClasses(teacher.id);
  const classNames = classes.map((c) => c.name);

  return (
    <>
      <TeacherNavigation name={teacher.name} classNames={classNames} />
      <main className="min-h-[calc(100vh-4rem)] px-4 py-6 md:ml-64 md:px-8 md:py-6">
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={<TeacherLoading />}>{children}</Suspense>
        </div>
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
