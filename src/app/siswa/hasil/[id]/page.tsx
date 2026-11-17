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
  Zap,
  ArrowRight,
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

  // Jika sesi belum selesai
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
    <div className="space-y-6">
      {/* Header Kartu Hasil */}
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <span className="mt-2 text-xs font-semibold tracking-wide text-indigo-600 uppercase">
            Pilar {pillarName} • {topicName}
          </span>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {session.assessment.title}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Diselesaikan pada: {formatWibDateTime(session.finishedAt)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Grid Ringkasan Skor & Poin */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Jawaban Benar
              </span>
              <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {correctCount}{" "}
                <span className="text-sm font-normal text-slate-500">
                  / {totalQuestions}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Akurasi
              </span>
              <div className="mt-1 text-2xl font-bold tabular-nums text-indigo-600">
                {accuracy}%
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Poin Jawaban
              </span>
              <div className="mt-1 text-2xl font-bold tabular-nums text-amber-600">
                +{answerPoints}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Bonus Waktu
              </span>
              <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
                {bonusPoints > 0 ? `+${bonusPoints}` : "0"}
              </div>
            </div>
          </div>

          {/* Banner Total Poin */}
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Total Poin Diperoleh
                </h2>
                <p className="text-xs text-slate-600">
                  {bonusPoints > 0
                    ? `${answerPoints} poin jawaban + ${bonusPoints} poin bonus ketepatan waktu`
                    : "Poin langsung diakumulasikan ke peringkat angkatanmu"}
                </p>
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-amber-700">
              +{totalPoints} Poin
            </div>
          </div>

          {/* Navigasi Aksi */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/siswa">
              <Button variant="outline" size="sm" className="gap-1.5 font-medium">
                <Home className="h-4 w-4" />
                Kembali ke Beranda
              </Button>
            </Link>
            <Link href="/siswa/riwayat">
              <Button variant="outline" size="sm" className="gap-1.5 font-medium">
                <RotateCcw className="h-4 w-4" />
                Lihat Riwayat
              </Button>
            </Link>
            <Link href="/siswa/peringkat">
              <Button size="sm" className="gap-1.5 bg-indigo-600 font-semibold text-white hover:bg-indigo-700">
                <Award className="h-4 w-4" />
                Lihat Papan Peringkat
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Bagian Pembahasan (D-04, D-11) */}
      {!isReviewAvailable ? (
        <Card className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Pembahasan Belum Dibuka
              </h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
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
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Pembahasan Soal
            </h2>
            <span className="text-xs font-medium text-slate-500">
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
                className={cn(
                  "rounded-xl border bg-white p-5 shadow-sm space-y-4",
                  userIsCorrect ? "border-slate-200" : "border-rose-200",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Soal {idx + 1}
                    </span>
                    <p className="text-base font-medium text-slate-900">
                      {question.text}
                    </p>
                  </div>
                  {userIsCorrect ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Benar
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
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

                    let optionStyle = "border-slate-200 bg-white text-slate-700";
                    let label = null;

                    if (isCorrect) {
                      optionStyle =
                        "border-emerald-300 bg-emerald-50 text-emerald-950 font-medium";
                      label = (
                        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Kunci Benar
                        </span>
                      );
                    } else if (isSelected && !isCorrect) {
                      optionStyle =
                        "border-rose-300 bg-rose-50 text-rose-950 font-medium";
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
                          "flex items-center justify-between rounded-lg border p-3 text-sm leading-relaxed",
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
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
                      Penjelasan
                    </div>
                    <p className="mt-1 text-sm text-slate-700 leading-relaxed">
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
