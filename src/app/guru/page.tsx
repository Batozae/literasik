import { Suspense } from "react";
import { requireTeacher } from "@/lib/auth";
import { getDashboardData } from "@/lib/analytics-data";
import type { PeriodFilter } from "@/lib/analytics";
import { FilterBar } from "@/app/guru/filter-bar";
import { PillarChart, TrendChart } from "@/app/guru/dashboard-charts";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  BookOpen,
  UserCheck,
} from "lucide-react";
import { createPracticeFromTopicAction } from "@/app/guru/actions";

// ─────────────────────────────────────────────
// Helper: parse search params menjadi PeriodFilter
// ─────────────────────────────────────────────

function parsePeriodFilter(params: {
  period?: string;
  from?: string;
  to?: string;
}): PeriodFilter {
  const p = params.period ?? "all";
  if (p === "7") return { kind: "days", days: 7 };
  if (p === "30") return { kind: "days", days: 30 };
  if (p === "custom" && params.from && params.to) {
    return {
      kind: "custom",
      from: new Date(params.from + "T00:00:00+07:00"),
      to: new Date(params.to + "T23:59:59+07:00"),
    };
  }
  return { kind: "all" };
}

// ─────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <Card className="rounded-xl border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
              {value}
            </p>
            {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
          </div>
          <Icon className="h-8 w-8 text-indigo-300 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Konten utama dashboard
// ─────────────────────────────────────────────

async function DashboardContent({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const teacher = await requireTeacher();
  const now = new Date();

  const filter = parsePeriodFilter(searchParams);
  const selectedClassId = searchParams.classId ? Number(searchParams.classId) : null;

  const data = await getDashboardData(teacher.id, filter, selectedClassId, now);

  const fmt = (n: number | null, digits = 0) =>
    n === null ? "—" : `${(n * 100).toFixed(digits)}%`;

  // Serialisasi trend (Date → string) untuk client component
  const trendSerialized = data.trend.map((t) => ({
    ...t,
    opensAt: t.opensAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Dasbor Analitik
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Pantau perkembangan dan partisipasi kelas yang kamu ajar.
        </p>
      </div>

      {/* GUR-01: Filter */}
      <FilterBar
        classOptions={data.classOptions}
        selectedClassId={searchParams.classId ?? ""}
        selectedPeriod={searchParams.period ?? "all"}
        customFrom={searchParams.from ?? ""}
        customTo={searchParams.to ?? ""}
      />

      {/* GUR-02: KPI */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          KPI
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Total Siswa"
            value={String(data.kpi.totalStudents)}
            icon={Users}
          />
          <KpiCard
            label="Partisipasi"
            value={fmt(data.kpi.participationRate)}
            icon={UserCheck}
            sub={
              data.kpi.openAssessmentCount > 0
                ? `${data.kpi.openAssessmentCount} asesmen`
                : "Belum ada asesmen"
            }
          />
          <KpiCard
            label="Rata-rata Akurasi"
            value={fmt(data.kpi.avgWajibAccuracy)}
            icon={TrendingUp}
          />
          <KpiCard
            label="Perlu Pendampingan"
            value={String(data.kpi.needsAttentionCount)}
            icon={AlertCircle}
          />
          <KpiCard
            label="Sesi Latihan"
            value={String(data.kpi.practiceSessionCount)}
            icon={BookOpen}
            sub={`${data.kpi.practiceStudentCount} siswa`}
          />
          <KpiCard
            label="Siswa Berlatih"
            value={String(data.kpi.practiceStudentCount)}
            icon={CheckCircle2}
          />
        </div>
      </section>

      {/* GUR-03: Skor Pilar dan GUR-05: Tren */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Skor per Pilar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PillarChart scores={data.pillarScores} />
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Tren Akurasi per Asesmen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart points={trendSerialized} />
          </CardContent>
        </Card>
      </div>

      {/* GUR-04: Materi Tersulit */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Tingkat Kesulitan Materi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topicDifficulties.length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada data untuk periode ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="pb-2 text-left">Materi</th>
                    <th className="pb-2 text-left">Pilar</th>
                    <th className="pb-2 text-right">Jawaban</th>
                    <th className="pb-2 text-right">Akurasi</th>
                    <th className="pb-2 text-left pl-4">Kategori</th>
                    <th className="pb-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topicDifficulties.map((td) => (
                    <tr
                      key={td.topicId}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-2.5 font-medium text-slate-900">
                        {td.topicName}
                      </td>
                      <td className="py-2.5 text-slate-600">{td.pillarCode}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">
                        {td.totalAnswers}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-slate-900 font-medium">
                        {td.accuracy !== null
                          ? `${(td.accuracy * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="py-2.5 pl-4">
                        <StatusBadge
                          status={td.category as "Sulit" | "Sedang" | "Mudah" | "Data belum cukup"}
                        />
                      </td>
                      <td className="py-2.5 text-right">
                        {(td.category === "Sulit" || td.category === "Sedang") && (
                          <form action={createPracticeFromTopicAction}>
                            <input type="hidden" name="topicId" value={td.topicId} />
                            <input
                              type="hidden"
                              name="classId"
                              value={selectedClassId ?? ""}
                            />
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              Buat latihan
                            </Button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GUR-06: Tabel Siswa */}
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Daftar Siswa
          </CardTitle>
          <div className="flex gap-2">
            <Link href={`/api/ekspor/siswa?${new URLSearchParams({
              ...(searchParams.classId ? { classId: searchParams.classId } : {}),
              ...(searchParams.period ? { period: searchParams.period } : {}),
              ...(searchParams.from ? { from: searchParams.from } : {}),
              ...(searchParams.to ? { to: searchParams.to } : {}),
            }).toString()}`}>
              <Button variant="outline" size="sm">
                Ekspor CSV Siswa
              </Button>
            </Link>
            <Link href={`/api/ekspor/materi?${new URLSearchParams({
              ...(searchParams.classId ? { classId: searchParams.classId } : {}),
              ...(searchParams.period ? { period: searchParams.period } : {}),
              ...(searchParams.from ? { from: searchParams.from } : {}),
              ...(searchParams.to ? { to: searchParams.to } : {}),
            }).toString()}`}>
              <Button variant="outline" size="sm">
                Ekspor CSV Materi
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.studentRows.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada siswa.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="pb-2 text-left">Nama</th>
                    <th className="pb-2 text-left">Kelas</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-right">Jawaban</th>
                    <th className="pb-2 text-right">Akurasi</th>
                    <th className="pb-2 text-right">Poin</th>
                    <th className="pb-2 text-right">Latihan</th>
                    <th className="pb-2 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.studentRows
                    .sort((a, b) => {
                      // Urut: Perlu Pendampingan dulu, lalu Pantau, Belum Cukup Data, Aman
                      const order = {
                        "Perlu Pendampingan": 0,
                        Pantau: 1,
                        "Belum Cukup Data": 2,
                        Aman: 3,
                      };
                      const diff = order[a.status] - order[b.status];
                      if (diff !== 0) return diff;
                      return a.name.localeCompare(b.name, "id");
                    })
                    .map((row) => (
                      <tr
                        key={row.studentId}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-2.5 font-medium text-slate-900">
                          {row.name}
                        </td>
                        <td className="py-2.5 text-slate-600">{row.className}</td>
                        <td className="py-2.5">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-slate-600">
                          {row.totalAnswers}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-slate-900">
                          {row.overallAccuracy !== null
                            ? `${(row.overallAccuracy * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-slate-900">
                          {row.wajibPoints}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-slate-600">
                          {row.practiceSessions}
                        </td>
                        <td className="py-2.5 text-right">
                          <Link href={`/guru/siswa/${row.studentId}`}>
                            <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
                              Lihat
                            </Button>
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
}

// ─────────────────────────────────────────────
// Page export
// ─────────────────────────────────────────────

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireTeacher();
  const params = await searchParams;
  return (
    <Suspense
      fallback={
        <div className="text-sm text-slate-500">Memuat dasbor analitik...</div>
      }
    >
      <DashboardContent searchParams={params} />
    </Suspense>
  );
}
