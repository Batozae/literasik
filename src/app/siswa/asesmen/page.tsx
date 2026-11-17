import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatWibDateTime } from "@/lib/schedule";
import { StatusBadge, type StatusType } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { startWajibSessionAction, finalizeExpiredSession } from "@/app/siswa/actions";
import { Clock, Calendar, HelpCircle, ArrowRight } from "lucide-react";

export default async function StudentAssessmentsPage() {
  const user = await requireStudent();
  const now = new Date();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });

  if (!profile) {
    return (
      <div className="p-4 text-center text-sm text-slate-600">
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

  // Auto-close any expired sessions
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
        <Card className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            Belum ada asesmen wajib yang dijadwalkan untuk angkatanmu.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
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

            return (
              <Card
                key={assessment.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      Pilar {pillar}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  <CardTitle className="mt-2 text-lg font-semibold text-slate-900">
                    {assessment.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600">
                    {assessment.description || `Materi: ${topic}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
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
                          variant="outline"
                          size="sm"
                          className="gap-1.5 font-medium"
                        >
                          Lihat Hasil & Pembahasan
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}

                    {canContinue && session && (
                      <Link href={`/siswa/sesi/${session.id}`}>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-indigo-600 font-semibold text-white hover:bg-indigo-700 active:translate-y-0.5"
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
                          className="gap-1.5 bg-indigo-600 font-semibold text-white hover:bg-indigo-700 active:translate-y-0.5"
                        >
                          Mulai Kerjakan
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    )}

                    {!isFinished && !canContinue && !canStart && status === "Dijadwalkan" && (
                      <Button
                        disabled
                        variant="outline"
                        size="sm"
                        className="text-xs text-slate-400"
                      >
                        Belum Dibuka
                      </Button>
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
