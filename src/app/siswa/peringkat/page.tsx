import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sortAndRankLeaderboard, type LeaderboardCandidate } from "@/lib/scoring";
import { LEADERBOARD_TOP_N } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Medal, Award, Sparkles, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function StudentLeaderboardPage() {
  const user = await requireStudent();

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

  const gradeLevel = profile.class.gradeLevel;

  // 2. Ambil seluruh siswa dalam satu angkatan beserta poin & akurasi WAJIB
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

  // 3. Bangun kandidat papan peringkat
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

  // 4. Urutkan dan beri peringkat (hanya dengan poin > 0)
  const rankedAll = sortAndRankLeaderboard(candidates);
  const top25 = rankedAll.slice(0, LEADERBOARD_TOP_N);

  const currentUserInTop25 = top25.find((e) => e.studentId === user.id);
  const currentUserEntry = candidates.find((e) => e.studentId === user.id);
  const currentUserWajibPoints = currentUserEntry?.wajibPoints ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Angkatan {gradeLevel}
        </span>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Peringkat Angkatan
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Papan 25 besar literasi digital berdasarkan capaian asesmen wajib.
        </p>
      </div>

      {/* Kartu Status Jika Siswa di Luar 25 Besar (D-07 & DESIGN.md Section 8) */}
      {!currentUserInTop25 && (
        <Card className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Belum masuk 25 besar. Poinmu: {currentUserWajibPoints}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Terus selesaikan asesmen wajib berikutnya dengan teliti untuk menembus
                25 besar angkatan!
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Jika Siswa Masuk 25 Besar, Tampilkan Info Singkat */}
      {currentUserInTop25 && (
        <Card className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                  Posisi Kamu
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Peringkat #{currentUserInTop25.rank} ({currentUserInTop25.wajibPoints} Poin)
                </h2>
              </div>
            </div>
            <span className="text-xs font-medium text-indigo-700">
              Akurasi: {Math.round(currentUserInTop25.wajibAccuracy * 100)}%
            </span>
          </div>
        </Card>
      )}

      {/* Tabel 25 Besar */}
      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-900">
              Top 25 Angkatan {gradeLevel}
            </CardTitle>
            <span className="text-xs text-slate-500">
              {top25.length} Siswa Terdaftar
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
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-16 text-center text-xs font-medium text-slate-600">
                    Posisi
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-600">
                    Nama Siswa
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-600">
                    Poin
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-600">
                    Akurasi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top25.map((entry) => {
                  const isCurrent = entry.studentId === user.id;
                  const isTop1 = entry.rank === 1;
                  const isTop2 = entry.rank === 2;
                  const isTop3 = entry.rank === 3;
                  const isTop3Any = isTop1 || isTop2 || isTop3;

                  return (
                    <TableRow
                      key={entry.studentId}
                      className={cn(
                        "transition",
                        isCurrent && "ring-2 ring-indigo-600 bg-indigo-50/50 font-semibold",
                      )}
                    >
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isTop1 && (
                            <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          {isTop2 && (
                            <Medal className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          {isTop3 && (
                            <Award className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          <span
                            className={cn(
                              "tabular-nums text-sm",
                              isTop3Any ? "font-bold text-amber-600" : "text-slate-600",
                            )}
                          >
                            {entry.rank}
                          </span>
                        </div>
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
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
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
