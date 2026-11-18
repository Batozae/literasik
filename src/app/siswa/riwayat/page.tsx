import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatWibDateTime } from "@/lib/schedule";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function StudentHistoryPage() {
  const user = await requireStudent();
  const now = new Date();

  const sessions = await prisma.assessmentSession.findMany({
    where: {
      studentId: user.id,
      finishedAt: { not: null },
    },
    include: {
      assessment: {
        include: {
          sourceTopic: { include: { pillar: true } },
          questions: {
            include: {
              question: {
                include: { topic: { include: { pillar: true } } },
              },
            },
          },
        },
      },
      topic: { include: { pillar: true } },
      answers: true,
      pointEvents: true,
    },
    orderBy: { finishedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Riwayat Asesmen
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Catatan hasil asesmen dan latihan yang telah kamu selesaikan.
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <RotateCcw className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-slate-900">
            Belum Ada Riwayat
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kamu belum menyelesaikan sesi asesmen apa pun.
          </p>
          <div className="mt-4">
            <Link href="/siswa/asesmen">
              <Button
                size="sm"
                className="rounded-lg bg-indigo-900 px-4 font-semibold text-white hover:bg-indigo-800"
              >
                Lihat Asesmen Wajib
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sessions.map((session) => {
            const title =
              session.assessment?.title ?? session.topic?.name ?? "Sesi Asesmen";
            const topicName =
              session.assessment?.sourceTopic?.name ??
              session.assessment?.questions[0]?.question.topic.name ??
              session.topic?.name ??
              "Materi";
            const pillarName =
              session.assessment?.sourceTopic?.pillar.name ??
              session.assessment?.questions[0]?.question.topic.pillar.name ??
              session.topic?.pillar.name ??
              "Pilar";

            const totalQuestions =
              session.assessment?.questions.length ?? session.answers.length;
            const correctCount = session.answers.filter((a) => a.isCorrect).length;
            const accuracy =
              totalQuestions > 0
                ? Math.round((correctCount / totalQuestions) * 100)
                : 0;

            const totalPoints = session.pointEvents.reduce(
              (sum, e) => sum + e.points,
              0,
            );

            const isWajib = session.kind === "WAJIB";
            const closesAt = session.assessment?.closesAt;
            const isReviewOpen = !isWajib || (closesAt ? now >= closesAt : true);

            return (
              <Card
                key={session.id}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 pl-6 shadow-sm transition-colors hover:bg-white/95"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-1.5",
                    isWajib ? "bg-indigo-600" : "bg-emerald-500",
                  )}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          isWajib
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-emerald-50 text-emerald-700",
                        )}
                      >
                        {isWajib ? "Asesmen Wajib" : "Latihan"}
                      </span>
                      <span className="text-xs text-slate-500">
                        Pilar {pillarName}: {topicName}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>

                    <div className="flex items-center gap-1 pt-1 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatWibDateTime(session.finishedAt!)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-start">
                    <div className="flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      +{totalPoints} Poin
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Skor: </span>
                      <strong className="text-slate-900">
                        {correctCount}/{totalQuestions}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Akurasi: </span>
                      <strong className="font-semibold text-indigo-700">
                        {accuracy}%
                      </strong>
                    </div>
                    <div>
                      {isReviewOpen ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Pembahasan Terbuka
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          Pembahasan Belum Dibuka
                        </span>
                      )}
                    </div>
                  </div>

                  <Link href={`/siswa/hasil/${session.id}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1 rounded-lg bg-slate-100 font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      Lihat Hasil
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
