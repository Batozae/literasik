import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherGradeLevels } from "@/lib/teacher-scope";
import { computeStudentStatus, computeTopicDifficulties } from "@/lib/analytics";
import { calculateLevel } from "@/lib/scoring";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatWibDateTime } from "@/lib/schedule";
import { ChevronLeft } from "lucide-react";

async function StudentDetailContent({ studentId }: { studentId: number }) {
  const teacher = await requireTeacher();

  // Pastikan guru boleh melihat siswa ini
  const gradeLevels = await getTeacherGradeLevels(teacher.id);
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

  // Ambil semua jawaban sesi WAJIB (semua waktu untuk detail)
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
      session: {
        select: {
          id: true,
          assessmentId: true,
          finishedAt: true,
          assessment: {
            select: {
              id: true,
              title: true,
              opensAt: true,
              closesAt: true,
              sourceTopic: {
                select: {
                  name: true,
                  pillar: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { answeredAt: "asc" },
  });

  // Topik yang diakses guru
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

  // Status siswa
  const statusResult = computeStudentStatus(studentId, rawAnswers, topicNames);

  // Tingkat kesulitan per materi (perspektif siswa ini saja)
  const topicDifficulties = computeTopicDifficulties(rawAnswers, topicList);

  // Poin total
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

  // Riwayat sesi WAJIB
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

  // Sesi latihan
  const practiceSessions = await prisma.assessmentSession.findMany({
    where: { studentId, kind: "LATIHAN", finishedAt: { not: null } },
    select: { id: true, finishedAt: true },
    orderBy: { finishedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Back */}
      <div>
        <Link href="/guru">
          <Button variant="ghost" size="sm" className="gap-1 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Dasbor
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            {student.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {studentClass.name} · @{student.username}
          </p>
        </div>
        <StatusBadge status={statusResult.status} className="text-sm h-8 px-3" />
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Level</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{levelInfo.level}</p>
            <Progress value={levelInfo.progressPercent} className="mt-2 h-1.5" />
            <p className="mt-1 text-xs text-slate-500">
              {levelInfo.pointsToNext > 0
                ? `${levelInfo.pointsToNext} poin ke level ${levelInfo.level + 1}`
                : "Level maksimum"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Poin</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{totalPoints}</p>
            <p className="mt-1 text-xs text-slate-500">{wajibPoints} poin wajib</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Jawaban Wajib</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{rawAnswers.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              {statusResult.overallAccuracy !== null
                ? `${(statusResult.overallAccuracy * 100).toFixed(1)}% akurasi`
                : "Belum ada data"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sesi Latihan</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{practiceSessions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alasan status (jika ada materi lemah) */}
      {statusResult.weakTopics.length > 0 && (
        <Card className="rounded-xl border-rose-200 bg-rose-50 shadow-sm">
          <CardContent className="p-4">
            <p className="font-semibold text-rose-700">
              Materi yang perlu perhatian:
            </p>
            <ul className="mt-1 list-disc list-inside text-sm text-rose-700">
              {statusResult.weakTopics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Performa per materi */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Performa per Materi</CardTitle>
          <p className="text-sm text-slate-500">Berdasarkan seluruh jawaban asesmen WAJIB.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-2 text-left">Materi</th>
                  <th className="pb-2 text-left">Pilar</th>
                  <th className="pb-2 text-right">Jawaban</th>
                  <th className="pb-2 text-right">Akurasi</th>
                  <th className="pb-2 text-left pl-4">Kategori</th>
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
                    <tr key={td.topicId} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 font-medium text-slate-900">{td.topicName}</td>
                      <td className="py-2.5 text-slate-600">{td.pillarCode}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{td.totalAnswers}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-900">
                        {td.accuracy !== null ? `${(td.accuracy * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2.5 pl-4">
                        <StatusBadge status={td.category as "Sulit" | "Sedang" | "Mudah" | "Data belum cukup"} />
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
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Riwayat Asesmen Wajib</CardTitle>
        </CardHeader>
        <CardContent>
          {wajibSessions.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada sesi wajib selesai.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="pb-2 text-left">Asesmen</th>
                    <th className="pb-2 text-left">Materi</th>
                    <th className="pb-2 text-right">Benar</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 text-right">Akurasi</th>
                    <th className="pb-2 text-left pl-4">Selesai</th>
                  </tr>
                </thead>
                <tbody>
                  {wajibSessions.map((s) => {
                    const correct = s.answers.filter((a) => a.isCorrect).length;
                    const total = s.answers.length;
                    const acc = total > 0 ? (correct / total * 100).toFixed(0) : "—";
                    return (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 font-medium text-slate-900">
                          {s.assessment?.title ?? "—"}
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {s.assessment?.sourceTopic?.name ?? "—"}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{correct}</td>
                        <td className="py-2.5 text-right tabular-nums">{total}</td>
                        <td className="py-2.5 text-right tabular-nums font-medium">
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
