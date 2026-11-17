import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateLevel } from "@/lib/scoring";
import { formatWibDateTime } from "@/lib/schedule";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Award,
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Lock,
  Play,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function SiswaHomePage() {
  const user = await requireStudent();
  const now = new Date();

  // 1. Profil siswa
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

  // 2. Total poin & level
  const pointEvents = await prisma.pointEvent.findMany({
    where: { studentId: user.id },
  });
  const totalPoints = pointEvents.reduce((sum, e) => sum + e.points, 0);
  const levelInfo = calculateLevel(totalPoints);

  // 3. Lencana
  const allBadges = await prisma.badge.findMany({
    orderBy: { id: "asc" },
  });
  const studentBadges = await prisma.studentBadge.findMany({
    where: { studentId: user.id },
    include: { badge: true },
  });
  const earnedBadgeMap = new Map(
    studentBadges.map((sb) => [sb.badge.code, sb.awardedAt]),
  );

  // 4. Asesmen aktif / berlangsung untuk angkatan ini
  const activeWajibAssessments = await prisma.assessment.findMany({
    where: {
      gradeLevel: profile.class.gradeLevel,
      type: "WAJIB",
      isActive: true,
    },
    include: {
      sourceTopic: { include: { pillar: true } },
      questions: {
        include: { question: { include: { topic: { include: { pillar: true } } } } },
      },
    },
    orderBy: { opensAt: "asc" },
  });

  const studentSessions = await prisma.assessmentSession.findMany({
    where: { studentId: user.id, kind: "WAJIB" },
  });
  const sessionMap = new Map(studentSessions.map((s) => [s.assessmentId, s]));

  // Cari asesmen yang sedang berlangsung dan belum diselesaikan siswa
  const ongoingAssessment = activeWajibAssessments.find((a) => {
    const s = sessionMap.get(a.id);
    if (s?.finishedAt) return false;
    if (!a.opensAt || !a.closesAt) return false;
    return now >= a.opensAt && now < a.closesAt;
  });

  return (
    <div className="space-y-6">
      {/* Sapaan Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Ruang Belajar Siswa
        </span>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Halo, {user.name}!
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Kelas {profile.class.name} • Angkatan {profile.class.gradeLevel}
        </p>
      </div>

      {/* Banner Asesmen Berlangsung (Jika Ada) */}
      {ongoingAssessment && (
        <Card className="rounded-xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Play className="h-5 w-5" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-800 uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5" /> Asesmen Sedang Berlangsung
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  {ongoingAssessment.title}
                </h2>
                <p className="text-xs text-slate-600">
                  Tutup pada: {formatWibDateTime(ongoingAssessment.closesAt!)}
                </p>
              </div>
            </div>
            <Link
              href={
                sessionMap.get(ongoingAssessment.id)
                  ? `/siswa/sesi/${sessionMap.get(ongoingAssessment.id)!.id}`
                  : `/siswa/asesmen`
              }
            >
              <Button
                size="sm"
                className="w-full sm:w-auto gap-1.5 bg-indigo-600 font-semibold text-white hover:bg-indigo-700 active:translate-y-0.5"
              >
                {sessionMap.get(ongoingAssessment.id)
                  ? "Lanjutkan Pengerjaan"
                  : "Mulai Kerjakan"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Kartu Level & Gamifikasi (DESIGN.md Section 6) */}
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Tingkat Kemahiran
              </span>
              <CardTitle className="text-xl font-bold text-slate-900">
                Level {levelInfo.level}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold tabular-nums text-slate-900">
                {totalPoints} Poin
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Progress Bar Level Teal */}
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-slate-600">
              <span>Kemajuan Level {levelInfo.level}</span>
              <span className="font-medium tabular-nums">
                {levelInfo.nextLevelThreshold !== null
                  ? `${levelInfo.pointsToNext} poin menuju Level ${levelInfo.level + 1}`
                  : "Level Maksimum"}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Lencana diperoleh:{" "}
              <strong className="text-slate-900">{studentBadges.length}</strong> /{" "}
              {allBadges.length}
            </span>
            <Link
              href="/siswa/peringkat"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Lihat Peringkat Angkatan →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Koleksi Lencana (9 Lencana) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Koleksi Lencana</h2>
          <span className="text-xs font-medium text-slate-500">
            {studentBadges.length} dari {allBadges.length} Terbuka
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {allBadges.map((badge) => {
            const isEarned = earnedBadgeMap.has(badge.code);
            const awardedAt = earnedBadgeMap.get(badge.code);

            return (
              <div
                key={badge.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 transition",
                  isEarned
                    ? "border-amber-200 bg-white shadow-sm"
                    : "border-slate-200 bg-slate-50/70 opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isEarned
                      ? "bg-amber-100 text-amber-600"
                      : "bg-slate-200 text-slate-400",
                  )}
                >
                  {isEarned ? (
                    <Award className="h-5 w-5" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3
                      className={cn(
                        "truncate text-sm font-semibold",
                        isEarned ? "text-slate-900" : "text-slate-600",
                      )}
                    >
                      {badge.name}
                    </h3>
                    {isEarned && (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {badge.description}
                  </p>
                  {isEarned && awardedAt && (
                    <div className="pt-1 text-[11px] text-slate-400">
                      Terbuka: {formatWibDateTime(awardedAt)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Menu Navigasi Cepat Siswa */}
      <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
        <Link href="/siswa/asesmen">
          <Card className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-indigo-300 hover:shadow-md">
            <BookOpen className="mx-auto h-6 w-6 text-indigo-600" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              Asesmen Wajib
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Jadwal asesmen angkatan
            </p>
          </Card>
        </Link>

        <Link href="/siswa/peringkat">
          <Card className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-indigo-300 hover:shadow-md">
            <Trophy className="mx-auto h-6 w-6 text-amber-500" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              Peringkat Angkatan
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Papan 25 besar
            </p>
          </Card>
        </Link>

        <Link href="/siswa/riwayat" className="col-span-2 sm:col-span-1">
          <Card className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-indigo-300 hover:shadow-md">
            <Award className="mx-auto h-6 w-6 text-teal-600" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              Riwayat Belajar
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Hasil & pembahasan sesi
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
