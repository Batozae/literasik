import { Suspense } from "react";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sortAndRankLeaderboard, type LeaderboardCandidate } from "@/lib/scoring";
import { LEADERBOARD_TOP_N } from "@/lib/config";
import { getInitials, PODIUM_STYLES, RANK_BADGE_CLASSES } from "@/lib/podium";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Medal, Award } from "lucide-react";
import { StudentPageHeader } from "@/components/student-page-header";
import { cn } from "@/lib/utils";

async function StudentLeaderboardContent() {
  const user = await requireStudent();

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

  const cohortProfiles = await prisma.studentProfile.findMany({
    where: {
      class: { gradeLevel },
    },
    include: {
      user: { select: { id: true, name: true } },
      class: { select: { name: true } },
    },
  });
  const cohortStudentIds = cohortProfiles.map((sp) => sp.userId);

  const [pointSums, answerGroups] = await Promise.all([
    prisma.pointEvent.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: cohortStudentIds },
        type: { in: ["WAJIB_ANSWER", "WAJIB_BONUS"] },
      },
      _sum: { points: true },
    }),
    prisma.answer.groupBy({
      by: ["studentId", "isCorrect"],
      where: {
        studentId: { in: cohortStudentIds },
        session: { kind: "WAJIB" },
      },
      _count: { id: true },
    }),
  ]);

  const wajibPointsMap = new Map<number, number>();
  for (const row of pointSums) {
    wajibPointsMap.set(row.studentId, row._sum.points ?? 0);
  }

  const wajibAccuracyMap = new Map<number, { total: number; correct: number }>();
  for (const row of answerGroups) {
    const s = wajibAccuracyMap.get(row.studentId) ?? { total: 0, correct: 0 };
    s.total += row._count.id;
    if (row.isCorrect) s.correct += row._count.id;
    wajibAccuracyMap.set(row.studentId, s);
  }

  const candidates: LeaderboardCandidate[] = cohortProfiles.map((sp) => {
    const wajibPoints = wajibPointsMap.get(sp.userId) ?? 0;
    const acc = wajibAccuracyMap.get(sp.userId);
    const wajibAccuracy = acc && acc.total > 0 ? acc.correct / acc.total : 0;

    return {
      studentId: sp.userId,
      name: sp.user.name,
      className: sp.class.name,
      wajibPoints,
      wajibAccuracy,
    };
  });

  const rankedAll = sortAndRankLeaderboard(candidates);
  const top25 = rankedAll.slice(0, LEADERBOARD_TOP_N);
  const topThree = top25.slice(0, 3);

  const currentUserInTop25 = top25.find((e) => e.studentId === user.id);
  const currentUserEntry = candidates.find((e) => e.studentId === user.id);
  const currentUserWajibPoints = currentUserEntry?.wajibPoints ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <StudentPageHeader
        eyebrow={`Angkatan ${gradeLevel}`}
        title="Peringkat Angkatan"
        description="Papan 25 besar literasi digital berdasarkan capaian asesmen wajib."
        icon={<Trophy className="h-5 w-5" />}
        accent="amber"
      />

      {/* Kartu Status Jika Siswa di Luar 25 Besar (D-07: tanpa nomor peringkat) */}
      {!currentUserInTop25 && (
        <div className="relative overflow-hidden rounded-xl bg-white p-4 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-amber-400" />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Belum masuk 25 besar. Poinmu: {currentUserWajibPoints}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Terus selesaikan asesmen wajib berikutnya dengan teliti untuk menembus
                25 besar angkatan!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Jika Siswa Masuk 25 Besar */}
      {currentUserInTop25 && (
        <div className="relative overflow-hidden rounded-xl bg-white p-4 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-indigo-700" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  Posisi Kamu
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Peringkat #{currentUserInTop25.rank} ({currentUserInTop25.wajibPoints} Poin)
                </h2>
              </div>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Akurasi {Math.round(currentUserInTop25.wajibAccuracy * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Podium 3 Besar */}
      {topThree.length > 0 && (
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-900">
              Peraih Skor Tertinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {topThree.map((entry, idx) => {
                const style = PODIUM_STYLES[idx] ?? PODIUM_STYLES[2];
                const isCurrent = entry.studentId === user.id;
                return (
                  <div
                    key={entry.studentId}
                    className={cn(
                      "flex min-w-0 flex-col items-center justify-between rounded-xl p-2 text-center sm:p-4",
                      style.card,
                      isCurrent && "ring-2 ring-indigo-950 ring-offset-2",
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold sm:h-12 sm:w-12 sm:text-sm ${style.ring}`}
                      >
                        {getInitials(entry.name)}
                      </div>
                      <p className="mt-2 line-clamp-1 w-full text-xs font-bold sm:mt-2 sm:text-sm">
                        {entry.formattedName}
                      </p>
                      <p className={`text-[10px] sm:text-xs ${style.sub}`}>
                        {entry.wajibPoints} Poin Wajib
                      </p>
                    </div>

                    <div className="my-2">
                      <p className="text-xl font-extrabold tabular-nums">
                        {Math.round(entry.wajibAccuracy * 100)}%
                      </p>
                    </div>

                    <div
                      className={`inline-flex w-full items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold sm:px-2 sm:text-xs ${style.pill}`}
                    >
                      <Medal className="h-3.5 w-3.5" />
                      <span>{style.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabel 25 Besar */}
      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900">
              Top 25 Angkatan {gradeLevel}
            </CardTitle>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {top25.length} Siswa
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Diurutkan berdasarkan poin peringkat, akurasi, dan nama.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {top25.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Belum ada siswa yang memiliki poin asesmen wajib.
            </div>
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="h-9 w-16 px-3 text-center text-[11px] font-medium text-slate-500 sm:h-12 sm:text-xs">
                    Posisi
                  </TableHead>
                  <TableHead className="h-9 px-3 text-[11px] font-medium text-slate-500 sm:h-12 sm:text-xs">
                    Nama
                  </TableHead>
                  <TableHead className="h-9 w-14 px-3 text-right text-[11px] font-medium text-slate-500 sm:h-12 sm:w-20 sm:text-xs">
                    Poin
                  </TableHead>
                  <TableHead className="h-9 w-20 px-3 text-right text-[11px] font-medium text-slate-500 sm:h-12 sm:w-24 sm:text-xs">
                    Akurasi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top25.map((entry) => {
                  const isCurrent = entry.studentId === user.id;

                  return (
                    <TableRow
                      key={entry.studentId}
                      className={cn(
                        "border-slate-100/80 transition-colors hover:bg-slate-50",
                        isCurrent && "bg-indigo-50/80 font-semibold ring-2 ring-inset ring-indigo-600",
                      )}
                    >
                      <TableCell className="p-2 text-center sm:p-3">
                        {entry.rank <= 3 ? (
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                              RANK_BADGE_CLASSES[entry.rank] ?? "bg-slate-200 text-slate-900",
                            )}
                          >
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="tabular-nums text-sm text-slate-600">
                            {entry.rank}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="min-w-0 p-2 sm:p-3">
                        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                          <span
                            className={cn(
                              "min-w-0 max-w-[100px] truncate text-xs sm:max-w-none sm:text-sm",
                              isCurrent ? "font-bold text-indigo-950" : "text-slate-900",
                            )}
                          >
                            {entry.formattedName}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-indigo-900 px-2 py-1 text-[10px] font-bold text-white">
                              Kamu
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="p-2 text-right tabular-nums text-xs font-semibold text-slate-900 sm:p-3 sm:text-sm">
                        {entry.wajibPoints}
                      </TableCell>

                      <TableCell className="p-2 text-right tabular-nums text-xs text-slate-600 sm:p-3 sm:text-sm">
                        {Math.round(entry.wajibAccuracy * 100)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentLeaderboardPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Memuat peringkat...</div>}>
      <StudentLeaderboardContent />
    </Suspense>
  );
}
