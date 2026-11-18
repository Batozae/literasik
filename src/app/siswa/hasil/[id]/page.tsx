import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatWibDateTime } from "@/lib/schedule";
import { finalizeExpiredSession } from "@/app/siswa/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  HelpCircle,
  Sparkles,
  Home,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function StudentResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStudent();
  const { id } = await params;
  const sessionId = Number(id);

  if (!Number.isInteger(sessionId)) notFound();

  const now = new Date();

  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      assessment: {
        include: {
          sourceTopic: { include: { pillar: true } },
          questions: {
            include: {
              question: {
                include: {
                  topic: { include: { pillar: true } },
                  options: {
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
      answers: true,
      pointEvents: true,
    },
  });

  if (!session || session.studentId !== user.id || !session.assessment) {
    notFound();
  }

  if (session.finishedAt === null) {
    if (session.assessment.closesAt && now >= session.assessment.closesAt) {
      await finalizeExpiredSession(sessionId, user.id, session.assessment.closesAt);
      session.finishedAt = session.assessment.closesAt;
    } else {
      redirect(`/siswa/sesi/${sessionId}`);
    }
  }

  const closesAt = session.assessment.closesAt;
  const isReviewAvailable = closesAt ? now >= closesAt : true;

  const totalQuestions = session.assessment.questions.length;
  const correctCount = session.answers.filter((a) => a.isCorrect).length;
  const accuracy =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const answerPoints = session.pointEvents
    .filter((e) => e.type === "WAJIB_ANSWER")
    .reduce((sum, e) => sum + e.points, 0);

  const bonusPoints = session.pointEvents
    .filter((e) => e.type === "WAJIB_BONUS")
    .reduce((sum, e) => sum + e.points, 0);

  const totalPoints = answerPoints + bonusPoints;

  const topicName =
    session.assessment.sourceTopic?.name ??
    session.assessment.questions[0]?.question.topic.name ??
    "Materi";
  const pillarName =
    session.assessment.sourceTopic?.pillar.name ??
    session.assessment.questions[0]?.question.topic.pillar.name ??
    "Pilar";

  const studentAnswersMap = new Map(
    session.answers.map((a) => [a.questionId, a.selectedOptionId]),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header Kartu Hasil Flat */}
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <span className="mt-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Pilar {pillarName}: {topicName}
          </span>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {session.assessment.title}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Diselesaikan pada: {formatWibDateTime(session.finishedAt)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Grid Ringkasan Skor & Poin Flat */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 text-center">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-slate-400" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Jawaban Benar
              </span>
              <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {correctCount}{" "}
                <span className="text-sm font-normal text-slate-500">
                  / {totalQuestions}
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 text-center">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-indigo-600" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Akurasi
              </span>
              <div className="mt-1 text-2xl font-bold tabular-nums text-indigo-700">
                {accuracy}%
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 text-center">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-amber-400" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Poin Jawaban
              </span>
              <div className="mt-1 text-2xl font-bold tabular-nums text-amber-600">
                +{answerPoints}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 text-center">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Bonus Waktu
              </span>
              <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
                {bonusPoints > 0 ? `+${bonusPoints}` : "0"}
              </div>
            </div>
          </div>

          {/* Banner Total Poin Flat */}
          <div className="relative flex items-center justify-between overflow-hidden rounded-xl bg-amber-50 p-4 pl-4">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-amber-400" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Total Poin Diperoleh
                </h2>
                <p className="text-xs text-slate-600">
                  {bonusPoints > 0
                    ? `${answerPoints} poin jawaban + ${bonusPoints} poin bonus ketepatan waktu`
                    : "Poin langsung diakumulasikan ke peringkat angkatanmu"}
                </p>
              </div>
            </div>
            <div className="text-xl font-extrabold tabular-nums text-amber-700 sm:text-2xl">
              +{totalPoints} Poin
            </div>
          </div>

          {/* Navigasi Aksi */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Link href="/siswa">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1 rounded-lg bg-slate-100 font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Home className="h-4 w-4" />
                Kembali ke Beranda
              </Button>
            </Link>
            <Link href="/siswa/riwayat">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1 rounded-lg bg-slate-100 font-semibold text-slate-700 hover:bg-slate-200"
              >
                <RotateCcw className="h-4 w-4" />
                Lihat Riwayat
              </Button>
            </Link>
            <Link href="/siswa/peringkat">
              <Button
                size="sm"
                className="gap-1 rounded-lg bg-indigo-900 font-semibold text-white hover:bg-indigo-800 active:scale-95"
              >
                <Award className="h-4 w-4" />
                Lihat Papan Peringkat
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Bagian Pembahasan (D-04, D-11) */}
      {!isReviewAvailable ? (
        <div className="relative overflow-hidden rounded-xl bg-white p-6 pl-8">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-slate-400" />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pembahasan Belum Dibuka
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Demi menjaga integritas dan keadilan asesmen bersama, kunci jawaban dan
                pembahasan lengkap baru akan terbuka secara otomatis setelah seluruh
                jendela asesmen ditutup pada{" "}
                <strong className="text-slate-900">
                  {closesAt ? formatWibDateTime(closesAt) : "jadwal penutupan"}
                </strong>
                .
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Silakan kembali ke halaman ini atau periksa menu Riwayat setelah waktu
                penutupan untuk melihat pembahasan detail.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold text-slate-900">
              Pembahasan Soal
            </h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {totalQuestions} Soal
            </span>
          </div>

          {session.assessment.questions.map((aq, idx) => {
            const question = aq.question;
            const userOptionId = studentAnswersMap.get(question.id);
            const userIsCorrect =
              question.options.find((o) => o.id === userOptionId)?.isCorrect ?? false;

            return (
              <Card
                key={question.id}
                className="relative space-y-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 pl-6 shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-1.5",
                    userIsCorrect ? "bg-emerald-500" : "bg-rose-500",
                  )}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Soal {idx + 1}
                    </span>
                    <p className="text-base font-medium text-slate-900">
                      {question.text}
                    </p>
                  </div>
                  {userIsCorrect ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Benar
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                      <XCircle className="h-3.5 w-3.5" />
                      Salah
                    </span>
                  )}
                </div>

                {/* Daftar Opsi */}
                <div className="space-y-2">
                  {question.options.map((opt) => {
                    const isSelected = userOptionId === opt.id;
                    const isCorrect = opt.isCorrect;

                    let optionStyle = "bg-slate-50 text-slate-700";
                    let label = null;

                    if (isCorrect) {
                      optionStyle = "bg-emerald-50 text-emerald-950 font-medium";
                      label = (
                        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Kunci Benar
                        </span>
                      );
                    } else if (isSelected && !isCorrect) {
                      optionStyle = "bg-rose-50 text-rose-950 font-medium";
                      label = (
                        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-rose-700">
                          <XCircle className="h-3.5 w-3.5" />
                          Jawabanmu
                        </span>
                      );
                    }

                    return (
                      <div
                        key={opt.id}
                        className={cn(
                          "flex items-center justify-between rounded-xl p-3 text-sm leading-relaxed",
                          optionStyle,
                        )}
                      >
                        <span className="flex-1">{opt.text}</span>
                        {label}
                      </div>
                    );
                  })}
                </div>

                {/* Kotak Penjelasan */}
                {question.explanation && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
                      Penjelasan
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
