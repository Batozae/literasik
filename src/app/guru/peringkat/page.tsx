import { Suspense } from "react";
import { requireTeacher } from "@/lib/auth";
import { getTeacherLeaderboardData } from "@/lib/analytics-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const GRADE_LABEL: Record<number, string> = {
  7: "Angkatan 7",
  8: "Angkatan 8",
};

const RANK_ICON = ["🥇", "🥈", "🥉"];

async function LeaderboardContent() {
  const teacher = await requireTeacher();
  const leaderboardData = await getTeacherLeaderboardData(teacher.id);

  return (
    <div className="space-y-8">
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
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            Belum ada data peringkat.
          </CardContent>
        </Card>
      ) : (
        leaderboardData.map(({ gradeLevel, ranked }) => (
          <Card key={gradeLevel} className="rounded-xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg font-semibold">
                  {GRADE_LABEL[gradeLevel] ?? `Angkatan ${gradeLevel}`}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {ranked.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada siswa dengan poin wajib.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <th className="pb-2 text-left w-12">Peringkat</th>
                        <th className="pb-2 text-left">Nama</th>
                        <th className="pb-2 text-right">Poin Wajib</th>
                        <th className="pb-2 text-right">Akurasi Wajib</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.slice(0, 25).map((entry) => (
                        <tr
                          key={entry.studentId}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-2.5 text-center">
                            {entry.rank <= 3 ? (
                              <span className="text-lg">{RANK_ICON[entry.rank - 1]}</span>
                            ) : (
                              <span className="tabular-nums font-medium text-slate-600">
                                {entry.rank}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 font-medium text-slate-900">
                            {entry.formattedName}
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-semibold text-indigo-700">
                            {entry.wajibPoints}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-slate-700">
                            {(entry.wajibAccuracy * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default async function TeacherLeaderboardPage() {
  await requireTeacher();
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Memuat peringkat...</div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
