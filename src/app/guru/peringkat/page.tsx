import { Suspense } from "react";
import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { getTeacherLeaderboardData } from "@/lib/analytics-data";
import { getInitials, PODIUM_STYLES, RANK_BADGE_CLASSES } from "@/lib/podium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal, Trophy } from "lucide-react";

const GRADE_LABEL: Record<number, string> = {
  7: "Angkatan 7",
  8: "Angkatan 8",
};

async function LeaderboardContent() {
  const teacher = await requireTeacher();
  const leaderboardData = await getTeacherLeaderboardData(teacher.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Peringkat Angkatan
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Top 25 siswa berdasarkan poin wajib (kumulatif semua waktu). Peringkat tidak
          berubah dengan filter periode.
        </p>
      </div>

      {leaderboardData.length === 0 ? (
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6 text-center text-sm text-slate-500">
            Belum ada data peringkat.
          </CardContent>
        </Card>
      ) : (
        leaderboardData.map(({ gradeLevel, ranked }) => {
          const top25 = ranked.slice(0, 25);
          const topThree = top25.slice(0, 3);

          return (
            <div key={gradeLevel} className="space-y-6">
              {/* Podium 3 Besar Flat & Interaktif */}
              {topThree.length > 0 && (
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base font-bold text-slate-900">
                          3 Besar {GRADE_LABEL[gradeLevel] ?? `Angkatan ${gradeLevel}`}
                        </CardTitle>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {top25.length} Siswa Terperingkat
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {topThree.map((entry, idx) => {
                        const style = PODIUM_STYLES[idx] ?? PODIUM_STYLES[2];
                        return (
                          <Link
                            key={entry.studentId}
                            href={`/guru/siswa/${entry.studentId}`}
                            className={`flex flex-col items-center justify-between rounded-xl p-4 text-center transition-all duration-150 hover:-translate-y-1 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${style.card}`}
                          >
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex h-13 w-13 items-center justify-center rounded-full text-base font-bold ${style.ring}`}
                              >
                                {getInitials(entry.name)}
                              </div>
                              <p className="mt-3 line-clamp-1 text-sm font-bold">
                                {entry.formattedName}
                              </p>
                              <p className={`text-xs ${style.sub}`}>
                                {entry.wajibPoints} Poin Wajib
                              </p>
                            </div>

                            <div className="my-3">
                              <p className="text-2xl font-extrabold tabular-nums tracking-tight">
                                {(entry.wajibAccuracy * 100).toFixed(1)}%
                              </p>
                            </div>

                            <div
                              className={`inline-flex w-full items-center justify-center gap-1 rounded-lg px-3 py-1 text-xs font-bold ${style.pill}`}
                            >
                              <Medal className="h-3.5 w-3.5" />
                              <span>{style.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabel Top 25 */}
              <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Daftar Top 25 — {GRADE_LABEL[gradeLevel] ?? `Angkatan ${gradeLevel}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {top25.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Belum ada siswa dengan poin wajib.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                            <th className="w-16 pb-2 text-center">Posisi</th>
                            <th className="pb-2 text-left">Nama</th>
                            <th className="pb-2 text-right">Poin Wajib</th>
                            <th className="pb-2 text-right">Akurasi Wajib</th>
                            <th className="pb-2 text-right">Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top25.map((entry) => (
                            <tr
                              key={entry.studentId}
                              className="border-b border-slate-100/80 transition-colors last:border-0 hover:bg-slate-50"
                            >
                              <td className="py-2 text-center">
                                {entry.rank <= 3 ? (
                                  <span
                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                      RANK_BADGE_CLASSES[entry.rank] ?? "bg-slate-200 text-slate-900"
                                    }`}
                                  >
                                    {entry.rank}
                                  </span>
                                ) : (
                                  <span className="tabular-nums font-medium text-slate-600">
                                    {entry.rank}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 font-medium text-slate-900">
                                {entry.formattedName}
                              </td>
                              <td className="py-2 text-right tabular-nums font-semibold text-indigo-700">
                                {entry.wajibPoints}
                              </td>
                              <td className="py-2 text-right tabular-nums text-slate-700">
                                {(entry.wajibAccuracy * 100).toFixed(1)}%
                              </td>
                              <td className="py-2 text-right">
                                <Link
                                  href={`/guru/siswa/${entry.studentId}`}
                                  className="inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                                >
                                  Lihat
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function TeacherLeaderboardPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Memuat peringkat...</div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
