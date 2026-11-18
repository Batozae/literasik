import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireTeacher } from "@/lib/auth";
import { isQuestionLocked } from "@/lib/question-rules";
import { getAssessmentStatus } from "@/lib/schedule";
import {
  assertQuestionAccess,
  getTeacherGradeLevels,
} from "@/lib/teacher-scope";
import { prisma } from "@/lib/prisma";
import { QuestionForm } from "../question-form";
import { updateQuestionAction } from "../actions";
import { QuestionStatusToggle } from "../question-status-toggle";

async function TeacherQuestionContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [teacher, { id: rawId }] = await Promise.all([requireTeacher(), params]);
  const questionId = Number(rawId);
  if (!Number.isInteger(questionId) || questionId < 1) notFound();
  const question = await assertQuestionAccess(teacher.id, questionId);
  const now = new Date();
  const statuses = question.assessmentQuestions.map(({ assessment }) => {
    if (!assessment.opensAt || !assessment.closesAt)
      return "Berlangsung" as const;
    return getAssessmentStatus(assessment.opensAt, assessment.closesAt, now);
  });
  const locked = isQuestionLocked(question.answers.length > 0, statuses);
  const gradeLevels = await getTeacherGradeLevels(teacher.id);

  let topics: Array<{
    id: number;
    name: string;
    gradeLevel: number;
    pillar: { name: string };
  }> = [];
  let loadFailed = false;

  try {
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
        className="mx-auto max-w-2xl rounded-xl bg-rose-50 p-6 text-sm text-rose-700"
      >
        Materi tidak dapat dimuat saat ini. Coba muat ulang halaman.
      </div>
    );
  }

  const updateAction = updateQuestionAction.bind(null, question.id);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/guru/soal"
          className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Bank Soal
        </Link>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Ubah Soal
          </h1>
          <p className="text-sm text-slate-600 md:text-base">
            Perbarui isi soal pada materi yang Anda ajar.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2">
          <Badge className="rounded-full border-0 bg-slate-100 px-2 text-slate-700">
            {locked ? "Terkunci" : "Dapat diubah"}
          </Badge>
          <QuestionStatusToggle
            questionId={question.id}
            initialActive={question.isActive}
          />
        </div>
      </header>
      <section className="rounded-xl bg-white p-4 md:p-6">
        <QuestionForm
          action={updateAction}
          topics={topics}
          locked={locked}
          initial={{
            topicId: question.topicId,
            text: question.text,
            explanation: question.explanation,
            difficulty: question.difficulty,
            options: question.options,
          }}
        />
      </section>
    </div>
  );
}

export default function TeacherQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl text-sm text-slate-500">
          Memuat soal...
        </div>
      }
    >
      <TeacherQuestionContent params={params} />
    </Suspense>
  );
}
