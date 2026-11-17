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
import { cn } from "@/lib/utils";

export default async function StudentLeaderboardPage() {
  const user = await requireStudent();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });

  if (!profile) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-600">
        Profil siswa tidak ditemukan.
      </div>
    );
  }

  const gradeLevel = profile.class.gradeLevel;

  const cohortStudents = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      student: {
        class: { gradeLevel },
      },
    },
    include: {
      student: { include: { class: true } },
      pointEvents: {
        where: {
          type: { in: ["WAJIB_ANSWER", "WAJIB_BONUS"] },
        },
      },
      answers: {
        where: {
          session: { kind: "WAJIB" },
        },
      },
    },
  });

  const candidates: LeaderboardCandidate[] = cohortStudents.map((s) => {
    const wajibPoints = s.pointEvents.reduce((sum, e) => sum + e.points, 0);
    const totalWajibAnswers = s.answers.length;
    const correctWajibAnswers = s.answers.filter((a) => a.isCorrect).length;
    const wajibAccuracy =
      totalWajibAnswers > 0 ? correctWajibAnswers / totalWajibAnswers : 0;

    return {
      studentId: s.id,
      name: s.name,
      className: s.student?.class.name ?? "",
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
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Angkatan {gradeLevel}
        </span>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Peringkat Angkatan
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Papan 25 besar literasi digital berdasarkan capaian asesmen wajib.
        </p>
      </div>

      {/* Kartu Status Jika Siswa di Luar 25 Besar (D-07: tanpa nomor peringkat) */}
      {!currentUserInTop25 && (
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 pl-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-amber-400" />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Belum masuk 25 besar. Poinmu: {currentUserWajibPoints}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Terus selesaikan asesmen wajib berikutnya dengan teliti untuk menembus
                25 besar angkatan!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Jika Siswa Masuk 25 Besar */}
      {currentUserInTop25 && (
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 pl-6">
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
        <Card className="rounded-2xl border-0 bg-white shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-900">
              Peraih Skor Tertinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {topThree.map((entry, idx) => {
                const style = PODIUM_STYLES[idx] ?? PODIUM_STYLES[2];
                const isCurrent = entry.studentId === user.id;
                return (
                  <div
                    key={entry.studentId}
                    className={cn(
                      "flex flex-col items-center justify-between rounded-2xl p-4 text-center",
                      style.card,
                      isCurrent && "ring-2 ring-indigo-950 ring-offset-2",
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${style.ring}`}
                      >
                        {getInitials(entry.name)}
                      </div>
                      <p className="mt-2.5 line-clamp-1 text-sm font-bold">
                        {entry.formattedName}
                      </p>
                      <p className={`text-xs ${style.sub}`}>
                        {entry.wajibPoints} Poin Wajib
                      </p>
                    </div>

                    <div className="my-2.5">
                      <p className="text-xl font-extrabold tabular-nums">
                        {Math.round(entry.wajibAccuracy * 100)}%
                      </p>
                    </div>

                    <div
                      className={`inline-flex w-full items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${style.pill}`}
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
      <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-none">
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
            <div className="p-8 text-center text-sm text-slate-500">
              Belum ada siswa yang memiliki poin asesmen wajib.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-16 text-center text-xs font-medium text-slate-500">
                    Posisi
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Nama Siswa
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500">
                    Poin
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500">
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
                      <TableCell className="text-center">
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

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm",
                              isCurrent ? "font-bold text-indigo-950" : "text-slate-900",
                            )}
                          >
                            {entry.formattedName}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-indigo-900 px-2 py-0.5 text-[10px] font-bold text-white">
                              Kamu
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right tabular-nums text-sm font-semibold text-slate-900">
                        {entry.wajibPoints}
                      </TableCell>

                      <TableCell className="text-right tabular-nums text-sm text-slate-600">
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
