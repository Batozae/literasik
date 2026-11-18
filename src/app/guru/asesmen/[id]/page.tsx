import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatWibDateTimeLocalInput,
  isAssessmentCompositionLocked,
  isTopicUnlockedForPractice,
} from "@/lib/assessment-rules";
import { formatWibDateTime, getAssessmentStatus } from "@/lib/schedule";
import {
  assertAssessmentAccess,
  getTeacherClasses,
} from "@/lib/teacher-scope";
import { StatusBadge, type StatusType } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAssessmentAction } from "../actions";
import {
  AssessmentStatusToggle,
  AssessmentWindowActions,
} from "../assessment-controls";
import { AssessmentForm } from "../assessment-form";

async function TeacherAssessmentDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [teacher, { id: rawId }] = await Promise.all([
    requireTeacher(),
    params,
  ]);
  const assessmentId = Number(rawId);
  if (!Number.isInteger(assessmentId) || assessmentId < 1) notFound();

  const assessment = await assertAssessmentAccess(teacher.id, assessmentId);
  const now = new Date();

  const [classes, topics, activeQuestions, wajibAssessments] =
    await Promise.all([
      getTeacherClasses(teacher.id),
      prisma.topic.findMany({
        where: { gradeLevel: assessment.gradeLevel },
        include: { pillar: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.question.findMany({
        where: {
          topic: { gradeLevel: assessment.gradeLevel },
          OR: [
            { isActive: true },
            {
              id: {
                in: assessment.questions.map((aq) => aq.questionId),
              },
            },
          ],
        },
        include: {
          topic: { include: { pillar: { select: { name: true } } } },
          assessmentQuestions: {
            where: {
              assessmentId: { not: assessmentId },
              assessment: { type: "WAJIB" },
            },
            select: { assessmentId: true },
          },
        },
        orderBy: [{ topic: { name: "asc" } }, { id: "asc" }],
      }),
      prisma.assessment.findMany({
        where: {
          gradeLevel: assessment.gradeLevel,
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

  const scheduleStatus =
    assessment.type === "WAJIB" && assessment.opensAt && assessment.closesAt
      ? getAssessmentStatus(assessment.opensAt, assessment.closesAt, now)
      : "Dijadwalkan";

  const badgeStatus: StatusType =
    scheduleStatus === "Ditutup"
      ? "Selesai"
      : scheduleStatus === "Berlangsung"
        ? "Berlangsung"
        : "Dijadwalkan";

  const compositionLocked = isAssessmentCompositionLocked({
    type: assessment.type,
    opensAt: assessment.opensAt,
    now,
    hasSessions: assessment.sessions.length > 0,
  });

  const updateAction = updateAssessmentAction.bind(null, assessment.id);

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

      {/* Header & Kontrol Cepat */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                assessment.type === "WAJIB"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-teal-50 text-teal-700"
              }`}
            >
              {assessment.type === "WAJIB"
                ? "Asesmen Wajib"
                : "Latihan Rekomendasi Guru"}
            </span>
            {assessment.type === "WAJIB" && (
              <StatusBadge
                status={badgeStatus}
                label={
                  scheduleStatus === "Ditutup"
                    ? "Ditutup / Selesai"
                    : scheduleStatus
                }
              />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            {assessment.title}
          </h1>
          <p className="text-sm text-slate-600">
            Angkatan {assessment.gradeLevel} • {assessment.questions.length}{" "}
            soal terdaftar • {assessment.sessions.length} sesi siswa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <AssessmentStatusToggle
            assessmentId={assessment.id}
            initialActive={assessment.isActive}
            showActivateCta={
              assessment.type === "LATIHAN" && !assessment.isActive
            }
          />
          {assessment.type === "WAJIB" && (
            <AssessmentWindowActions
              assessmentId={assessment.id}
              assessmentTitle={assessment.title}
              status={scheduleStatus}
            />
          )}
        </div>
      </header>

      {/* Banner Tutup Loop untuk Draft Latihan Rekomendasi */}
      {assessment.type === "LATIHAN" && !assessment.isActive && (
        <div className="relative overflow-hidden rounded-xl border border-teal-200 bg-teal-50/70 p-4 pl-6">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-teal-500"
          />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Draft Latihan Rekomendasi Siap Ditinjau (Tutup Loop D-10)
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-700">
                 Anda dapat menyesuaikan judul, kelas sasaran, atau susunan soal
                di bawah. Setelah sesuai, klik tombol{" "}
                <strong>Aktifkan Sekarang</strong> di bagian kanan atas agar
                latihan ini langsung tampil di halaman Latihan siswa dengan
                label <strong>Rekomendasi Guru</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ringkasan Jadwal untuk WAJIB */}
      {assessment.type === "WAJIB" &&
        assessment.opensAt &&
        assessment.closesAt && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Waktu Buka
                </p>
                <p className="text-sm font-bold tabular-nums text-slate-900">
                  {formatWibDateTime(assessment.opensAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Waktu Tutup
                </p>
                <p className="text-sm font-bold tabular-nums text-slate-900">
                  {formatWibDateTime(assessment.closesAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Sesi Siswa
                </p>
                <p className="text-sm font-bold tabular-nums text-slate-900">
                  {assessment.sessions.filter((s) => s.finishedAt !== null)
                    .length}{" "}
                  selesai / {assessment.sessions.length} mulai
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Formulir Pengaturan & Komposisi Soal */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <AssessmentForm
          mode="edit"
          action={updateAction}
          compositionLocked={compositionLocked}
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
          questions={activeQuestions.map((q) => ({
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
            type: assessment.type,
            title: assessment.title,
            description: assessment.description ?? "",
            sourceTopicId: assessment.sourceTopicId,
            opensAtLocal: formatWibDateTimeLocalInput(assessment.opensAt),
            closesAtLocal: formatWibDateTimeLocalInput(assessment.closesAt),
            questionIds: assessment.questions.map((aq) => aq.questionId),
            targetClassIds: assessment.targetClasses.map((tc) => tc.classId),
            isActive: assessment.isActive,
          }}
        />
      </section>

      {/* Ringkasan Riwayat Pengerjaan Siswa pada Asesmen Ini */}
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-slate-900">
            Riwayat Pengerjaan Siswa ({assessment.sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assessment.sessions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada siswa yang mengerjakan asesmen ini.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="pb-2 text-left">Siswa</th>
                    <th className="pb-2 text-left">Kelas</th>
                    <th className="pb-2 text-left">Status Sesi</th>
                    <th className="pb-2 text-right">Benar / Dijawab</th>
                    <th className="pb-2 text-right">Waktu Selesai</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.sessions.slice(0, 40).map((s) => {
                    const correct = s.answers.filter((a) => a.isCorrect).length;
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-2 font-medium text-slate-900">
                          <Link
                            href={`/guru/siswa/${s.studentId}`}
                            className="hover:text-indigo-700 hover:underline"
                          >
                            {s.student.name}
                          </Link>
                        </td>
                        <td className="py-2 text-slate-600">
                          {s.student.student?.class.name ?? "—"}
                        </td>
                        <td className="py-2">
                          <StatusBadge
                            status={s.finishedAt ? "Selesai" : "Berlangsung"}
                          />
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
                          {correct} / {s.answers.length}
                        </td>
                        <td className="py-2 text-right text-xs text-slate-500 tabular-nums">
                          {s.finishedAt
                            ? formatWibDateTime(s.finishedAt)
                            : "Sedang dikerjakan"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeacherAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl p-6 text-sm text-slate-500">
          Memuat detail asesmen...
        </div>
      }
    >
      <TeacherAssessmentDetailContent params={params} />
    </Suspense>
  );
}
