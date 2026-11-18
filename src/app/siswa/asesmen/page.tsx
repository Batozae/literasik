import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatWibDateTime } from "@/lib/schedule";
import { StatusBadge, type StatusType } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { startWajibSessionAction, finalizeExpiredSession } from "@/app/siswa/actions";
import { Clock, Calendar, HelpCircle, ArrowRight } from "lucide-react";

const STATUS_STRIP: Record<string, string> = {
  Berlangsung: "bg-indigo-500",
  Selesai: "bg-emerald-500",
  Dijadwalkan: "bg-amber-400",
  Terlewat: "bg-rose-400",
};

export default async function StudentAssessmentsPage() {
  const user = await requireStudent();
  const now = new Date();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });

  if (!profile) {
    return (
      <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-600">
        Profil siswa tidak ditemukan.
      </div>
    );
  }

  const assessments = await prisma.assessment.findMany({
    where: {
      gradeLevel: profile.class.gradeLevel,
      type: "WAJIB",
      isActive: true,
    },
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
    orderBy: { opensAt: "asc" },
  });

  const sessions = await prisma.assessmentSession.findMany({
    where: { studentId: user.id, kind: "WAJIB" },
  });
  const sessionMap = new Map(sessions.map((s) => [s.assessmentId, s]));

  for (const session of sessions) {
    if (session.finishedAt === null && session.assessmentId) {
      const ass = assessments.find((a) => a.id === session.assessmentId);
      if (ass?.closesAt && now >= ass.closesAt) {
        await finalizeExpiredSession(session.id, user.id, ass.closesAt);
        session.finishedAt = ass.closesAt;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Asesmen Wajib
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Asesmen literasi digital terjadwal untuk kelas {profile.class.name}.
        </p>
      </div>

      {assessments.length === 0 ? (
        <Card className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            Belum ada asesmen wajib yang dijadwalkan untuk angkatanmu.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {assessments.map((assessment) => {
            const session = sessionMap.get(assessment.id);
            const opensAt = assessment.opensAt;
            const closesAt = assessment.closesAt;
            const questionCount = assessment.questions.length;
            const topic =
              assessment.sourceTopic?.name ??
              assessment.questions[0]?.question.topic.name ??
              "Materi Umum";
            const pillar =
              assessment.sourceTopic?.pillar.name ??
              assessment.questions[0]?.question.topic.pillar.name ??
              "Pilar";

            let status: StatusType = "Dijadwalkan";
            let canStart = false;
            let canContinue = false;
            let isFinished = false;

            if (session?.finishedAt) {
              status = "Selesai";
              isFinished = true;
            } else if (session && !session.finishedAt) {
              if (closesAt && now >= closesAt) {
                status = "Selesai";
                isFinished = true;
              } else {
                status = "Berlangsung";
                canContinue = true;
              }
            } else {
              if (opensAt && closesAt) {
                if (now < opensAt) {
                  status = "Dijadwalkan";
                } else if (now >= opensAt && now < closesAt) {
                  status = "Berlangsung";
                  canStart = true;
                } else {
                  status = "Terlewat";
                }
              }
            }

            const stripClass = STATUS_STRIP[status] ?? "bg-slate-300";

            return (
              <Card
                key={assessment.id}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-white pl-2 shadow-sm transition-colors hover:bg-white/90"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-1.5 ${stripClass}`}
                />
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      Pilar {pillar}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  <CardTitle className="mt-2 text-lg font-bold text-slate-900">
                    {assessment.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    {assessment.description || `Materi: ${topic}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>{questionCount} Soal</span>
                    </div>
                    {opensAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Buka: {formatWibDateTime(opensAt)}</span>
                      </div>
                    )}
                    {closesAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Tutup: {formatWibDateTime(closesAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end border-t border-slate-100 pt-3">
                    {isFinished && session && (
                      <Link href={`/siswa/hasil/${session.id}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1 rounded-lg bg-slate-100 font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                          Lihat Hasil &amp; Pembahasan
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}

                    {canContinue && session && (
                      <Link href={`/siswa/sesi/${session.id}`}>
                        <Button
                          size="sm"
                          className="gap-1 rounded-lg bg-indigo-900 px-4 font-semibold text-white transition-all hover:bg-indigo-800 active:scale-95"
                        >
                          Lanjutkan Pengerjaan
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}

                    {canStart && (
                      <form action={startWajibSessionAction.bind(null, assessment.id)}>
                        <Button
                          type="submit"
                          size="sm"
                          className="gap-1 rounded-lg bg-indigo-900 px-4 font-semibold text-white transition-all hover:bg-indigo-800 active:scale-95"
                        >
                          Mulai Kerjakan
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    )}

                    {!isFinished && !canContinue && !canStart && status === "Dijadwalkan" && (
                      <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                        Belum Dibuka
                      </span>
                    )}

                    {!isFinished && !canContinue && !canStart && status === "Terlewat" && (
                      <span className="text-xs font-medium text-rose-600">
                        Waktu pengerjaan telah berakhir
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
