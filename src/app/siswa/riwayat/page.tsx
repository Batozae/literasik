import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatWibDateTime } from "@/lib/schedule";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
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
        <Card className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <RotateCcw className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            Belum Ada Riwayat
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kamu belum menyelesaikan sesi asesmen apa pun.
          </p>
          <div className="mt-4">
            <Link href="/siswa/asesmen">
              <Button size="sm" className="bg-indigo-600 font-semibold text-white hover:bg-indigo-700">
                Lihat Asesmen Wajib
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
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
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          isWajib
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-teal-50 text-teal-700 border border-teal-200",
                        )}
                      >
                        {isWajib ? "Asesmen Wajib" : "Latihan"}
                      </span>
                      <span className="text-xs text-slate-500">
                        Pilar {pillarName} • {topicName}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatWibDateTime(session.finishedAt!)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-start">
                    <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                      <Sparkles className="h-4 w-4" />
                      +{totalPoints} Poin
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-3">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Skor: </span>
                      <strong className="text-slate-900">
                        {correctCount}/{totalQuestions}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Akurasi: </span>
                      <strong className="text-indigo-600 font-semibold">
                        {accuracy}%
                      </strong>
                    </div>
                    <div>
                      {isReviewOpen ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
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
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-medium"
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
