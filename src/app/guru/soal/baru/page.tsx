import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireTeacher } from "@/lib/auth";
import { getTeacherGradeLevels } from "@/lib/teacher-scope";
import { prisma } from "@/lib/prisma";
import { QuestionForm } from "../question-form";
import { createQuestionAction } from "../actions";

async function TeacherNewQuestionContent() {
  const teacher = await requireTeacher();
  try {
    const gradeLevels = await getTeacherGradeLevels(teacher.id);
    const topics = await prisma.topic.findMany({
      where: { gradeLevel: { in: gradeLevels } },
      include: { pillar: { select: { name: true } } },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    });
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Tambah Soal
          </h1>
          <p className="text-base text-slate-600">
            Buat soal pilihan ganda untuk materi pada angkatan yang Anda ajar.
          </p>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <QuestionForm action={createQuestionAction} topics={topics} />
        </section>
      </div>
    );
  } catch {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"
      >
        Materi tidak dapat dimuat saat ini. Coba muat ulang halaman.
        <Button asChild variant="outline" className="ml-3 rounded-lg">
          <Link href="/guru/soal/baru">Coba lagi</Link>
        </Button>
      </div>
    );
  }
}

export default function TeacherNewQuestionPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl text-sm text-slate-500">
          Memuat halaman...
        </div>
      }
    >
      <TeacherNewQuestionContent />
    </Suspense>
  );
}
