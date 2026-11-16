import { Suspense } from "react";
import { notFound } from "next/navigation";
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
  teacherId,
}: {
  params: Promise<{ id: string }>;
  teacherId: number;
}) {
  const { id: rawId } = await params;
  const questionId = Number(rawId);
  if (!Number.isInteger(questionId) || questionId < 1) notFound();
  const question = await assertQuestionAccess(teacherId, questionId);
  const now = new Date();
  const statuses = question.assessmentQuestions.map(({ assessment }) => {
    if (!assessment.opensAt || !assessment.closesAt)
      return "Berlangsung" as const;
    return getAssessmentStatus(assessment.opensAt, assessment.closesAt, now);
  });
  const locked = isQuestionLocked(question.answers.length > 0, statuses);
  const gradeLevels = await getTeacherGradeLevels(teacherId);

  try {
    const topics = await prisma.topic.findMany({
      where: { gradeLevel: { in: gradeLevels } },
      include: { pillar: { select: { name: true } } },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    });
    const updateAction = updateQuestionAction.bind(null, question.id);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Ubah Soal
            </h1>
            <p className="text-base text-slate-600">
              Perbarui isi soal pada materi yang Anda ajar.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 text-slate-700"
            >
              {locked ? "Terkunci" : "Dapat diubah"}
            </Badge>
            <QuestionStatusToggle
              questionId={question.id}
              initialActive={question.isActive}
            />
          </div>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
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
  } catch {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"
      >
        Materi tidak dapat dimuat saat ini. Coba muat ulang halaman.
      </div>
    );
  }
}

export default async function TeacherQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const teacher = await requireTeacher();
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl text-sm text-slate-500">
          Memuat soal...
        </div>
      }
    >
      <TeacherQuestionContent params={params} teacherId={teacher.id} />
    </Suspense>
  );
}
