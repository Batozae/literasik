import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatWibDateTimeLocalInput,
  isTopicUnlockedForPractice,
} from "@/lib/assessment-rules";
import { getTeacherClasses, getTeacherGradeLevels } from "@/lib/teacher-scope";
import { createAssessmentAction } from "../actions";
import { AssessmentForm } from "../assessment-form";

async function TeacherNewAssessmentContent() {
  const teacher = await requireTeacher();
  const [gradeLevels, classes] = await Promise.all([
    getTeacherGradeLevels(teacher.id),
    getTeacherClasses(teacher.id),
  ]);
  const now = new Date();

  const [topics, questions, wajibAssessments] = await Promise.all([
    prisma.topic.findMany({
      where: { gradeLevel: { in: gradeLevels } },
      include: { pillar: { select: { name: true } } },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    }),
    prisma.question.findMany({
      where: {
        isActive: true,
        topic: { gradeLevel: { in: gradeLevels } },
      },
      include: {
        topic: { include: { pillar: { select: { name: true } } } },
        assessmentQuestions: {
          where: { assessment: { type: "WAJIB" } },
          select: { assessmentId: true },
        },
      },
      orderBy: [{ topic: { name: "asc" } }, { id: "asc" }],
    }),
    prisma.assessment.findMany({
      where: {
        gradeLevel: { in: gradeLevels },
        type: "WAJIB",
        isActive: true,
      },
      include: {
        questions: {
          select: { question: { select: { topicId: true } } },
        },
      },
    }),
  ]);

  const unlockedTopicIds = new Set<number>();
  for (const topic of topics) {
    const relatedWajib = wajibAssessments.filter(
      (a) =>
        a.sourceTopicId === topic.id ||
        a.questions.some((q) => q.question.topicId === topic.id),
    );
    if (isTopicUnlockedForPractice(relatedWajib, now)) {
      unlockedTopicIds.add(topic.id);
    }
  }

  const defaultOpensAt = new Date(now.getTime() + 60 * 60 * 1000);
  const defaultClosesAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/guru/asesmen"
          className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Kembali ke Kelola Asesmen</span>
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Buat Asesmen Baru
        </h1>
        <p className="text-sm text-slate-600 md:text-base">
          Susun asesmen wajib terjadwal atau latihan rekomendasi untuk angkatan{" "}
          {gradeLevels.join(", ")}.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <AssessmentForm
          mode="create"
          action={createAssessmentAction}
          topics={topics.map((t) => ({
            id: t.id,
            name: t.name,
            pillarName: t.pillar.name,
            unlockedForPractice: unlockedTopicIds.has(t.id),
          }))}
          classes={classes.map((c) => ({
            id: c.id,
            name: c.name,
            gradeLevel: c.gradeLevel,
          }))}
          questions={questions.map((q) => ({
            id: q.id,
            topicId: q.topicId,
            topicName: q.topic.name,
            pillarName: q.topic.pillar.name,
            text: q.text,
            difficulty: q.difficulty,
            usedInOtherWajib: q.assessmentQuestions.length > 0,
            unlockedForPractice: unlockedTopicIds.has(q.topicId),
          }))}
          initial={{
            type: "WAJIB",
            title: "",
            description: "",
            sourceTopicId: topics[0]?.id ?? null,
            opensAtLocal: formatWibDateTimeLocalInput(defaultOpensAt),
            closesAtLocal: formatWibDateTimeLocalInput(defaultClosesAt),
            questionIds: [],
            targetClassIds: classes.map((c) => c.id),
            isActive: true,
          }}
        />
      </section>
    </div>
  );
}

export default function TeacherNewAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl p-6 text-sm text-slate-500">
          Memuat formulir asesmen...
        </div>
      }
    >
      <TeacherNewAssessmentContent />
    </Suspense>
  );
}
