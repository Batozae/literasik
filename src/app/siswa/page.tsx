import { Suspense } from "react";
import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateLevel } from "@/lib/scoring";
import { formatWibDateTime } from "@/lib/schedule";
import { StatusBadge, type StatusType } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Lock,
  Play,
  Clock,
  Sparkles,
  RotateCcw,
  Footprints,
  Target,
  CalendarCheck,
  Compass,
  Zap,
  Laptop,
  Scale,
  ShieldCheck,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE_VISUALS: Record<
  string,
  {
    icon: LucideIcon;
    iconBg: string;
    cardBg: string;
    strip: string;
    dateText: string;
  }
> = {
  LANGKAH_PERTAMA: {
    icon: Footprints,
    iconBg: "bg-sky-500 text-white",
    cardBg: "bg-sky-50 hover:bg-sky-100/75",
    strip: "bg-sky-500",
    dateText: "text-sky-700",
  },
  TELITI: {
    icon: Target,
    iconBg: "bg-emerald-500 text-white",
    cardBg: "bg-emerald-50 hover:bg-emerald-100/75",
    strip: "bg-emerald-500",
    dateText: "text-emerald-700",
  },
  KONSISTEN: {
    icon: CalendarCheck,
    iconBg: "bg-amber-400 text-slate-950",
    cardBg: "bg-amber-50 hover:bg-amber-100/75",
    strip: "bg-amber-400",
    dateText: "text-amber-700",
  },
  PENJELAJAH: {
    icon: Compass,
    iconBg: "bg-violet-500 text-white",
    cardBg: "bg-violet-50 hover:bg-violet-100/75",
    strip: "bg-violet-500",
    dateText: "text-violet-700",
  },
  RAJIN_BERLATIH: {
    icon: Zap,
    iconBg: "bg-orange-500 text-white",
    cardBg: "bg-orange-50 hover:bg-orange-100/75",
    strip: "bg-orange-500",
    dateText: "text-orange-700",
  },
  TUNTAS_KECAKAPAN: {
    icon: Laptop,
    iconBg: "bg-indigo-600 text-white",
    cardBg: "bg-indigo-50 hover:bg-indigo-100/75",
    strip: "bg-indigo-600",
    dateText: "text-indigo-700",
  },
  TUNTAS_ETIKA: {
    icon: Scale,
    iconBg: "bg-teal-500 text-white",
    cardBg: "bg-teal-50 hover:bg-teal-100/75",
    strip: "bg-teal-500",
    dateText: "text-teal-700",
  },
  TUNTAS_KEAMANAN: {
    icon: ShieldCheck,
    iconBg: "bg-cyan-500 text-white",
    cardBg: "bg-cyan-50 hover:bg-cyan-100/75",
    strip: "bg-cyan-500",
    dateText: "text-cyan-700",
  },
  TUNTAS_BUDAYA: {
    icon: Globe,
    iconBg: "bg-rose-500 text-white",
    cardBg: "bg-rose-50 hover:bg-rose-100/75",
    strip: "bg-rose-500",
    dateText: "text-rose-700",
  },
};

const DEFAULT_BADGE_VISUAL = {
  icon: Award,
  iconBg: "bg-amber-400 text-slate-950",
  cardBg: "bg-amber-50 hover:bg-amber-100/75",
  strip: "bg-amber-400",
  dateText: "text-amber-700",
};

async function SiswaHomeContent() {
  const user = await requireStudent();
  const now = new Date();

  const [
    profile,
    pointEvents,
    allBadges,
    studentBadges,
    studentSessions,
  ] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: { class: true },
    }),
    prisma.pointEvent.findMany({
      where: { studentId: user.id },
    }),
    prisma.badge.findMany({
      orderBy: { id: "asc" },
    }),
    prisma.studentBadge.findMany({
      where: { studentId: user.id },
      include: { badge: true },
    }),
    prisma.assessmentSession.findMany({
      where: { studentId: user.id, kind: "WAJIB" },
    }),
  ]);

  if (!profile) {
    return (
      <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-600">
        Profil siswa tidak ditemukan.
      </div>
    );
  }

  const totalPoints = pointEvents.reduce((sum, e) => sum + e.points, 0);
  const wajibPoints = pointEvents
    .filter((e) => e.type === "WAJIB_ANSWER" || e.type === "WAJIB_BONUS")
    .reduce((sum, e) => sum + e.points, 0);
  const levelInfo = calculateLevel(totalPoints);

  const earnedBadgeMap = new Map(
    studentBadges.map((sb) => [sb.badge.code, sb.awardedAt]),
  );

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

  const sessionMap = new Map(studentSessions.map((s) => [s.assessmentId, s]));

  const completedWajibCount = activeWajibAssessments.filter((a) => {
    const s = sessionMap.get(a.id);
    if (s?.finishedAt) return true;
    if (s && a.closesAt && now >= a.closesAt) return true;
    return false;
  }).length;

  const ongoingAssessment = activeWajibAssessments.find((a) => {
    const s = sessionMap.get(a.id);
    if (s?.finishedAt) return false;
    if (!a.opensAt || !a.closesAt) return false;
    return now >= a.opensAt && now < a.closesAt;
  });

  // Ringkasan 3 asesmen wajib terbaru/terdekat untuk panel kiri
  const previewAssessments = [...activeWajibAssessments]
    .reverse()
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Banner Asesmen Sedang Berlangsung (jika ada) */}
      {ongoingAssessment && (
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-sky-500" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white">
                <Play className="h-5 w-5" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                  <Clock className="h-3.5 w-3.5" /> Asesmen Sedang Berlangsung
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  {ongoingAssessment.title}
                </h2>
                <p className="text-xs text-slate-500">
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
                className="w-full gap-1 rounded-xl bg-indigo-900 px-4 font-semibold text-white transition-all hover:bg-indigo-800 active:scale-95 sm:w-auto"
              >
                {sessionMap.get(ongoingAssessment.id)
                  ? "Lanjutkan Pengerjaan"
                  : "Mulai Kerjakan"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Baris 1: 4 Kartu Ringkasan KPI Flat Colorful */}
      <section aria-labelledby="siswa-kpi-heading">
        <h1 id="siswa-kpi-heading" className="sr-only">
          Ringkasan Ruang Belajar {user.name}
        </h1>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
          <Link
            href="#progres-level"
            className="group relative block overflow-hidden rounded-2xl bg-white p-3.5 pl-4.5 transition-colors hover:bg-teal-50/40 active:scale-[0.99] sm:p-4 sm:pl-6"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1.5 bg-teal-500 transition-all group-hover:w-2"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white transition-transform group-hover:scale-105 sm:h-12 sm:w-12">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-medium text-slate-500">Level Kamu</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-2xl">
                  Level {levelInfo.level}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {levelInfo.progressPercent}% menuju level berikut
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/siswa/peringkat"
            className="group relative block overflow-hidden rounded-2xl bg-white p-3.5 pl-4.5 transition-colors hover:bg-amber-50/40 active:scale-[0.99] sm:p-4 sm:pl-6"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1.5 bg-amber-400 transition-all group-hover:w-2"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 transition-transform group-hover:scale-105 sm:h-12 sm:w-12">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-medium text-slate-500">Total Poin</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-2xl">
                  {totalPoints}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {wajibPoints} poin peringkat
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="#koleksi-lencana"
            className="group relative block overflow-hidden rounded-2xl bg-white p-3.5 pl-4.5 transition-colors hover:bg-violet-50/40 active:scale-[0.99] sm:p-4 sm:pl-6"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1.5 bg-violet-500 transition-all group-hover:w-2"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white transition-transform group-hover:scale-105 sm:h-12 sm:w-12">
                <Award className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-medium text-slate-500">Lencana</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-2xl">
                  {studentBadges.length} / {allBadges.length}
                </p>
                <p className="truncate text-xs text-slate-500">Lencana terbuka</p>
              </div>
            </div>
          </Link>

          <Link
            href="/siswa/asesmen"
            className="group relative block overflow-hidden rounded-2xl bg-white p-3.5 pl-4.5 transition-colors hover:bg-sky-50/40 active:scale-[0.99] sm:p-4 sm:pl-6"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1.5 bg-sky-500 transition-all group-hover:w-2"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white transition-transform group-hover:scale-105 sm:h-12 sm:w-12">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-medium text-slate-500">Asesmen Wajib</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 sm:text-2xl">
                  {completedWajibCount} / {activeWajibAssessments.length}
                </p>
                <p className="truncate text-xs text-slate-500">Selesai dikerjakan</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Baris 2: Grid 2 Kolom Desktop (Progres + Jadwal di Kiri, Koleksi Lencana di Kanan) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Kolom Kiri */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Kartu Progres Level */}
          <Card
            id="progres-level"
            className="scroll-mt-20 rounded-2xl border-0 bg-white shadow-none"
          >
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900">
                  Kemajuan Level
                </CardTitle>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  Level {levelInfo.level}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs text-slate-600">
                  <span>Progres saat ini</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {levelInfo.nextLevelThreshold !== null
                      ? `${levelInfo.pointsToNext} poin lagi ke Level ${levelInfo.level + 1}`
                      : "Level Maksimum"}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${levelInfo.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                <Link
                  href="/siswa/latihan"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100"
                >
                  <Zap className="h-3.5 w-3.5 text-teal-600" />
                  <span>Latihan</span>
                </Link>
                <Link
                  href="/siswa/peringkat"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span>Peringkat</span>
                </Link>
                <Link
                  href="/siswa/riwayat"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-100"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-sky-600" />
                  <span>Riwayat</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Kartu Ringkasan Jadwal Asesmen Wajib */}
          <Card className="rounded-2xl border-0 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
              <CardTitle className="text-base font-bold text-slate-900">
                Jadwal Asesmen Wajib
              </CardTitle>
              <Link
                href="/siswa/asesmen"
                className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white"
              >
                Lihat Semua
              </Link>
            </CardHeader>
            <CardContent>
              {previewAssessments.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada asesmen wajib untuk angkatanmu.
                </p>
              ) : (
                <div className="space-y-1">
                  {previewAssessments.map((a) => {
                    const session = sessionMap.get(a.id);
                    let status: StatusType = "Dijadwalkan";
                    if (session?.finishedAt || (session && a.closesAt && now >= a.closesAt)) {
                      status = "Selesai";
                    } else if (session && !session.finishedAt) {
                      status = "Berlangsung";
                    } else if (a.opensAt && a.closesAt) {
                      if (now < a.opensAt) status = "Dijadwalkan";
                      else if (now < a.closesAt) status = "Berlangsung";
                      else status = "Terlewat";
                    }

                    const href =
                      status === "Selesai" && session
                        ? `/siswa/hasil/${session.id}`
                        : status === "Berlangsung" && session
                          ? `/siswa/sesi/${session.id}`
                          : "/siswa/asesmen";

                    return (
                      <Link
                        key={a.id}
                        href={href}
                        className="-mx-3 block rounded-xl px-3 py-2 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {a.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {a.opensAt ? formatWibDateTime(a.opensAt) : "Segera"}
                            </p>
                          </div>
                          <StatusBadge status={status} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Koleksi 9 Lencana Flat Colorful */}
        <Card
          id="koleksi-lencana"
          className="scroll-mt-20 rounded-2xl border-0 bg-white shadow-none lg:col-span-7"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
            <CardTitle className="text-base font-bold text-slate-900">
              Koleksi Lencana
            </CardTitle>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {studentBadges.length} dari {allBadges.length} Terbuka
            </span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {allBadges.map((badge) => {
                const isEarned = earnedBadgeMap.has(badge.code);
                const awardedAt = earnedBadgeMap.get(badge.code);
                const visual = BADGE_VISUALS[badge.code] ?? DEFAULT_BADGE_VISUAL;
                const BadgeIcon = visual.icon;

                return (
                  <div
                    key={badge.id}
                    className={cn(
                      "relative flex items-start gap-3 overflow-hidden rounded-2xl p-4 transition-colors",
                      isEarned
                        ? `pl-5 ${visual.cardBg}`
                        : "bg-slate-100/80 opacity-80",
                    )}
                  >
                    {isEarned && (
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0 left-0 w-1.5 ${visual.strip}`}
                      />
                    )}
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isEarned
                          ? visual.iconBg
                          : "bg-slate-200 text-slate-400",
                      )}
                    >
                      <BadgeIcon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <h3
                          className={cn(
                            "text-sm font-bold leading-snug",
                            isEarned ? "text-slate-900" : "text-slate-600",
                          )}
                        >
                          {badge.name}
                        </h3>
                        {isEarned ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">
                        {badge.description}
                      </p>
                      {isEarned && awardedAt && (
                        <div className={cn("pt-1 text-[11px] font-semibold", visual.dateText)}>
                          Terbuka: {formatWibDateTime(awardedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SiswaHomePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Memuat beranda...</div>}>
      <SiswaHomeContent />
    </Suspense>
  );
}
