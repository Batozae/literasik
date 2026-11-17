import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStudentStatus, computeTopicDifficulties } from "@/lib/analytics";
import { calculateLevel } from "@/lib/scoring";
import { formatWibDateTime } from "@/lib/schedule";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

async function StudentDetailContent({ studentId }: { studentId: number }) {
  const teacher = await requireTeacher();

  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId: teacher.id },
    select: { classId: true },
  });
  const teacherClassIds = teacherClasses.map((tc) => tc.classId);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    include: {
      user: { select: { id: true, name: true, username: true } },
      class: { select: { id: true, name: true, gradeLevel: true } },
    },
  });

  if (!studentProfile || !teacherClassIds.includes(studentProfile.classId)) {
    notFound();
  }

  const student = studentProfile.user;
  const studentClass = studentProfile.class;

  const wajibAnswers = await prisma.answer.findMany({
    where: {
      studentId,
      session: { kind: "WAJIB" },
    },
    select: {
      isCorrect: true,
      answeredAt: true,
      questionId: true,
      question: { select: { topicId: true } },
    },
    orderBy: { answeredAt: "asc" },
  });

  const topics = await prisma.topic.findMany({
    where: { gradeLevel: studentClass.gradeLevel },
    include: { pillar: { select: { code: true, name: true } } },
  });
  const topicNames = topics.map((t) => ({ id: t.id, name: t.name }));
  const topicList = topics.map((t) => ({
    id: t.id,
    name: t.name,
    pillarCode: t.pillar.code,
  }));

  const rawAnswers = wajibAnswers.map((a) => ({
    studentId,
    questionId: a.questionId,
    topicId: a.question.topicId,
    isCorrect: a.isCorrect,
    answeredAt: a.answeredAt,
  }));

  const statusResult = computeStudentStatus(studentId, rawAnswers, topicNames);
  const topicDifficulties = computeTopicDifficulties(rawAnswers, topicList);

  const pointEvents = await prisma.pointEvent.findMany({
    where: { studentId },
    select: { type: true, points: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const totalPoints = pointEvents.reduce((sum, pe) => sum + pe.points, 0);
  const wajibPoints = pointEvents
    .filter((pe) => pe.type === "WAJIB_ANSWER" || pe.type === "WAJIB_BONUS")
    .reduce((sum, pe) => sum + pe.points, 0);
  const levelInfo = calculateLevel(totalPoints);

  const wajibSessions = await prisma.assessmentSession.findMany({
    where: {
      studentId,
      kind: "WAJIB",
    },
    include: {
      assessment: {
        select: {
          title: true,
          opensAt: true,
          closesAt: true,
          sourceTopic: {
            select: { name: true, pillar: { select: { name: true } } },
          },
        },
      },
      answers: { select: { isCorrect: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  const practiceSessions = await prisma.assessmentSession.findMany({
    where: { studentId, kind: "LATIHAN", finishedAt: { not: null } },
    select: { id: true, finishedAt: true },
    orderBy: { finishedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/guru"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Dasbor
        </Link>
      </div>

      {/* Header Profil Siswa Flat */}
      <Card className="rounded-2xl border-0 bg-white shadow-none">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-950 text-lg font-bold text-white">
              {getInitials(student.name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                {student.name}
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Kelas {studentClass.name} · @{student.username}
              </p>
            </div>
          </div>
          <StatusBadge status={statusResult.status} className="h-8 px-3.5 text-sm" />
        </CardContent>
      </Card>

      {/* Kartu Ringkasan dengan Strip Aksen Warna */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-teal-500" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Award className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">Level</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900">
                Level {levelInfo.level}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-500"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {levelInfo.pointsToNext > 0
              ? `${levelInfo.pointsToNext} poin ke level ${levelInfo.level + 1}`
              : "Level maksimum"}
          </p>
        </div>

        <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-white p-5 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-amber-400" />
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500">Total Poin</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">{totalPoints}</p>
            <p className="text-xs text-slate-500">{wajibPoints} poin wajib</p>
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-white p-5 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-indigo-700" />
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500">Jawaban Wajib</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {rawAnswers.length}
            </p>
            <p className="text-xs text-slate-500">
              {statusResult.overallAccuracy !== null
                ? `${(statusResult.overallAccuracy * 100).toFixed(1)}% akurasi`
                : "Belum ada data"}
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-white p-5 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500">Sesi Latihan</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {practiceSessions.length}
            </p>
            <p className="text-xs text-slate-500">Mandiri &amp; rekomendasi</p>
          </div>
        </div>
      </div>

      {/* Alasan status (jika ada materi lemah) */}
      {statusResult.weakTopics.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-rose-50 p-5 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-rose-500" />
          <p className="font-semibold text-rose-800">
            Materi yang perlu perhatian:
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sm text-rose-700">
            {statusResult.weakTopics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Performa per materi */}
      <Card className="rounded-2xl border-0 bg-white shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-slate-900">
            Performa per Materi
          </CardTitle>
          <p className="text-xs text-slate-500">
            Berdasarkan seluruh jawaban asesmen WAJIB.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-2.5 text-left">Materi</th>
                  <th className="pb-2.5 text-left">Pilar</th>
                  <th className="pb-2.5 text-right">Jawaban</th>
                  <th className="pb-2.5 text-right">Akurasi</th>
                  <th className="pb-2.5 pl-4 text-left">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {topicDifficulties.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500">
                      Belum ada jawaban wajib.
                    </td>
                  </tr>
                ) : (
                  topicDifficulties.map((td) => (
                    <tr
                      key={td.topicId}
                      className="border-b border-slate-100/80 transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-2.5 font-medium text-slate-900">{td.topicName}</td>
                      <td className="py-2.5 text-slate-600">{td.pillarCode}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">
                        {td.totalAnswers}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-semibold text-slate-900">
                        {td.accuracy !== null ? `${(td.accuracy * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2.5 pl-4">
                        <StatusBadge
                          status={
                            td.category as
                              | "Sulit"
                              | "Sedang"
                              | "Mudah"
                              | "Data belum cukup"
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Riwayat sesi WAJIB */}
      <Card className="rounded-2xl border-0 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-base font-bold text-slate-900">
            Riwayat Asesmen Wajib
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wajibSessions.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada sesi wajib selesai.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="pb-2.5 text-left">Asesmen</th>
                    <th className="pb-2.5 text-left">Materi</th>
                    <th className="pb-2.5 text-right">Benar</th>
                    <th className="pb-2.5 text-right">Total</th>
                    <th className="pb-2.5 text-right">Akurasi</th>
                    <th className="pb-2.5 pl-4 text-left">Selesai</th>
                  </tr>
                </thead>
                <tbody>
                  {wajibSessions.map((s) => {
                    const correct = s.answers.filter((a) => a.isCorrect).length;
                    const total = s.answers.length;
                    const acc = total > 0 ? ((correct / total) * 100).toFixed(0) : "—";
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100/80 transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-2.5 font-medium text-slate-900">
                          {s.assessment?.title ?? "—"}
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {s.assessment?.sourceTopic?.name ?? "—"}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{correct}</td>
                        <td className="py-2.5 text-right tabular-nums">{total}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold">
                          {total > 0 ? `${acc}%` : "—"}
                        </td>
                        <td className="py-2.5 pl-4 text-slate-600">
                          {s.finishedAt ? formatWibDateTime(s.finishedAt) : "Belum selesai"}
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

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireTeacher();
  const { id } = await params;
  const studentId = Number(id);
  if (isNaN(studentId)) notFound();

  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Memuat detail siswa...</div>}>
      <StudentDetailContent studentId={studentId} />
    </Suspense>
  );
}
