import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTopicUnlockedForPractice } from "@/lib/assessment-rules";
import { getWibDate } from "@/lib/schedule";
import {
  POINTS_PRACTICE_CORRECT,
  POINTS_PRACTICE_DAILY_CAP,
} from "@/lib/scoring";
import {
  startRecommendedPracticeAction,
  startTopicPracticeAction,
} from "@/app/siswa/actions";
import { Button } from "@/components/ui/button";
import {
  StudentPageHeader,
  StudentSectionHeader,
} from "@/components/student-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function StudentPracticeContent() {
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

  const gradeLevel = profile.class.gradeLevel;

  const [
    topics,
    wajibAssessments,
    recommendedAssessments,
    practiceSessions,
    practicePointEvents,
  ] = await Promise.all([
    prisma.topic.findMany({
      where: { gradeLevel },
      include: {
        pillar: true,
        questions: {
          where: { isActive: true },
          select: { id: true },
        },
      },
      orderBy: [{ pillarId: "asc" }, { id: "asc" }],
    }),
    prisma.assessment.findMany({
      where: {
        gradeLevel,
        type: "WAJIB",
        isActive: true,
      },
      include: {
        questions: {
          select: { question: { select: { topicId: true } } },
        },
      },
    }),
    prisma.assessment.findMany({
      where: {
        gradeLevel,
        type: "LATIHAN",
        isActive: true,
        OR: [
          { targetClasses: { none: {} } },
          { targetClasses: { some: { classId: profile.classId } } },
        ],
      },
      include: {
        sourceTopic: { include: { pillar: true } },
        questions: {
          orderBy: { order: "asc" },
          include: {
            question: {
              include: { topic: { include: { pillar: true } } },
            },
          },
        },
        targetClasses: {
          include: { class: true },
        },
      },
      orderBy: { id: "desc" },
    }),
    prisma.assessmentSession.findMany({
      where: {
        studentId: user.id,
        kind: "LATIHAN",
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.pointEvent.findMany({
      where: {
        studentId: user.id,
        type: "LATIHAN_ANSWER",
      },
      select: { points: true, createdAt: true },
    }),
  ]);

  // Evaluasi materi mana saja yang sudah terbuka untuk latihan (D-04)
  const unlockedTopicIds = new Set<number>();
  for (const topic of topics) {
    const relatedWajib = wajibAssessments.filter(
      (a) =>
        a.sourceTopicId === topic.id ||
        a.questions.some((q) => q.question.topicId === topic.id),
    );
    if (
      topic.questions.length > 0 &&
      isTopicUnlockedForPractice(relatedWajib, now)
    ) {
      unlockedTopicIds.add(topic.id);
    }
  }

  // Filter latihan rekomendasi guru yang materinya sudah terbuka (D-04)
  const visibleRecommendations = recommendedAssessments.filter((asm) => {
    if (asm.questions.length === 0) return false;
    const topicIds = [
      ...new Set([
        ...(asm.sourceTopicId ? [asm.sourceTopicId] : []),
        ...asm.questions.map((q) => q.question.topicId),
      ]),
    ];
    return topicIds.every((id) => unlockedTopicIds.has(id));
  });

  const todayWib = getWibDate(now);
  const todayPracticePoints = practicePointEvents
    .filter((e) => getWibDate(e.createdAt) === todayWib)
    .reduce((sum, e) => sum + e.points, 0);

  const completedPracticeSessions = practiceSessions.filter(
    (s) => s.finishedAt !== null,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <StudentPageHeader
        title="Latihan Mandiri & Rekomendasi"
        description={
          <>
            Asah pemahamanmu dengan umpan balik langsung per soal (+
            {POINTS_PRACTICE_CORRECT} poin/benar, maks.{" "}
            {POINTS_PRACTICE_DAILY_CAP} poin/hari). Latihan menambah Level &amp;
            Lencana tanpa mengubah peringkat angkatan (D-01, D-04).
          </>
        }
        icon={<Sparkles className="h-5 w-5" />}
        accent="teal"
        action={
          <Button
            asChild
            variant="secondary"
            className="rounded-xl bg-white font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            <Link href="/siswa/asesmen">
              <BookOpen className="h-4 w-4" />
              <span>Lihat Asesmen Wajib</span>
            </Link>
          </Button>
        }
      />

      {/* Ringkasan KPI Latihan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-amber-400"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">
                Poin Latihan Hari Ini
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {todayPracticePoints} / {POINTS_PRACTICE_DAILY_CAP}
              </p>
              <p className="text-xs text-slate-500">Reset setiap hari (WIB)</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-teal-500"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Zap className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">
                Sesi Latihan Selesai
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {completedPracticeSessions.length} Sesi
              </p>
              <p className="text-xs text-slate-500">
                {completedPracticeSessions.length >= 3
                  ? "Lencana Rajin Berlatih terbuka!"
                  : `${Math.max(0, 3 - completedPracticeSessions.length)} sesi lagi untuk lencana Rajin Berlatih`}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-indigo-600"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">
                Materi Terbuka
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {unlockedTopicIds.size} / {topics.length}
              </p>
              <p className="text-xs text-slate-500">
                Angkatan {gradeLevel} (Kelas {profile.class.name})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 1: Latihan Rekomendasi Guru (D-10 / ASM-05) */}
      <section className="space-y-3">
        <StudentSectionHeader
          title="Rekomendasi Guru"
          description={`Latihan penguatan khusus yang disiapkan gurumu untuk kelas ${profile.class.name}.`}
          accent="teal"
          right={
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-700 shadow-sm">
              {visibleRecommendations.length} Latihan Aktif
            </span>
          }
        />

        {visibleRecommendations.length === 0 ? (
          <Card className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              Belum ada latihan rekomendasi aktif untuk kelasmu saat ini. Kamu
              tetap bisa berlatih lewat daftar materi di bawah!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleRecommendations.map((asm) => {
              const topicName =
                asm.sourceTopic?.name ??
                asm.questions[0]?.question.topic.name ??
                "Materi";
              const pillarName =
                asm.sourceTopic?.pillar.name ??
                asm.questions[0]?.question.topic.pillar.name ??
                "Pilar";

              const unfinishedSession = practiceSessions.find(
                (s) => s.assessmentId === asm.id && s.finishedAt === null,
              );
              const completedCount = completedPracticeSessions.filter(
                (s) => s.assessmentId === asm.id,
              ).length;

              return (
                <Card
                  key={asm.id}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-white pl-2 shadow-sm transition-colors hover:bg-white/95"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-1.5 bg-teal-500"
                  />
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Rekomendasi Guru
                      </span>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        Pilar {pillarName}
                      </span>
                    </div>
                    <CardTitle className="mt-2 text-lg font-bold text-slate-900">
                      {asm.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600">
                      {asm.description || `Materi: ${topicName}`}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {asm.questions.length} Soal
                      </span>
                      <span>Materi: {topicName}</span>
                      {completedCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Diselesaikan {completedCount}x
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end border-t border-slate-100 pt-3">
                      {unfinishedSession ? (
                        <Link href={`/siswa/sesi/${unfinishedSession.id}`}>
                          <Button
                            size="sm"
                            className="gap-1.5 rounded-lg bg-teal-600 px-4 font-semibold text-white hover:bg-teal-700 active:scale-95"
                          >
                            <span>Lanjutkan Latihan</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <form
                          action={startRecommendedPracticeAction.bind(
                            null,
                            asm.id,
                          )}
                        >
                          <Button
                            type="submit"
                            size="sm"
                            className="gap-1.5 rounded-lg bg-indigo-900 px-4 font-semibold text-white hover:bg-indigo-800 active:scale-95"
                          >
                            <span>
                              {completedCount > 0
                                ? "Latih Lagi"
                                : "Mulai Latihan"}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Bagian 2: Latihan Mandiri per Materi (D-04) */}
      <section className="space-y-3">
        <StudentSectionHeader
          title="Latihan Mandiri per Materi"
          description={`Pilih materi angkatan ${gradeLevel} yang jendela asesmen wajibnya sudah selesai untuk berlatih kapan saja (D-04).`}
          accent="indigo"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {topics.map((topic) => {
            const isUnlocked = unlockedTopicIds.has(topic.id);
            const unfinishedTopicSession = practiceSessions.find(
              (s) =>
                s.assessmentId === null &&
                s.topicId === topic.id &&
                s.finishedAt === null,
            );
            const completedTopicCount = completedPracticeSessions.filter(
              (s) => s.topicId === topic.id,
            ).length;

            return (
              <Card
                key={topic.id}
                className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white pl-2 shadow-sm transition-colors ${
                  isUnlocked ? "hover:bg-white/95" : "opacity-80"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-1.5 ${
                    isUnlocked ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                />
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      Pilar {topic.pillar.name}
                    </span>

                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Terbuka
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        <Lock className="h-3.5 w-3.5" />
                        Terkunci
                      </span>
                    )}
                  </div>

                  <CardTitle className="mt-2 text-lg font-bold text-slate-900">
                    {topic.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-600">
                    {isUnlocked
                      ? "Umpan balik benar/salah dan pembahasan langsung tampil setiap selesai menjawab soal."
                      : "Soal materi baru terbuka setelah jendela asesmen wajib materi ini tertutup untuk angkatanmu (D-04)."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <HelpCircle className="h-3.5 w-3.5" />
                      {topic.questions.length} Soal Aktif
                    </span>
                    {completedTopicCount > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                        <Zap className="h-3.5 w-3.5" />
                        Dikerjakan {completedTopicCount}x
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end border-t border-slate-100 pt-3">
                    {!isUnlocked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                        <Lock className="h-3.5 w-3.5" />
                        Menunggu Asesmen Wajib Ditutup
                      </span>
                    ) : unfinishedTopicSession ? (
                      <Link href={`/siswa/sesi/${unfinishedTopicSession.id}`}>
                        <Button
                          size="sm"
                          className="gap-1.5 rounded-lg bg-teal-600 px-4 font-semibold text-white hover:bg-teal-700 active:scale-95"
                        >
                          <span>Lanjutkan Latihan</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    ) : (
                      <form
                        action={startTopicPracticeAction.bind(null, topic.id)}
                      >
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          className="gap-1.5 rounded-lg bg-indigo-50 px-4 font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95"
                        >
                          <span>Mulai Latihan Mandiri</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function StudentPracticePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Memuat latihan...</div>}>
      <StudentPracticeContent />
    </Suspense>
  );
}
