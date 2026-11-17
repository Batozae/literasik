import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireTeacher } from "@/lib/auth";
import { getTeacherGradeLevels } from "@/lib/teacher-scope";
import { prisma } from "@/lib/prisma";
import { QuestionForm } from "../question-form";
import { createQuestionAction } from "../actions";

async function TeacherNewQuestionContent() {
  const teacher = await requireTeacher();
  let topics: Array<{
    id: number;
    name: string;
    gradeLevel: number;
    pillar: { name: string };
  }> = [];
  let loadFailed = false;

  try {
    const gradeLevels = await getTeacherGradeLevels(teacher.id);
    topics = await prisma.topic.findMany({
      where: { gradeLevel: { in: gradeLevels } },
      include: { pillar: { select: { name: true } } },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    });
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-2xl rounded-2xl bg-rose-50 p-6 text-sm text-rose-700"
      >
        Materi tidak dapat dimuat saat ini. Coba muat ulang halaman.
        <Button asChild variant="secondary" className="ml-3 rounded-xl bg-white">
          <Link href="/guru/soal/baru">Coba lagi</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/guru/soal"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Bank Soal
        </Link>
      </div>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Tambah Soal
        </h1>
        <p className="text-sm text-slate-600 md:text-base">
          Buat soal pilihan ganda untuk materi pada angkatan yang Anda ajar.
        </p>
      </header>
      <section className="rounded-2xl bg-white p-5 md:p-6">
        <QuestionForm action={createQuestionAction} topics={topics} />
      </section>
    </div>
  );
}

export default async function TeacherNewQuestionPage() {
  await requireTeacher();
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
