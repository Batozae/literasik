import { Suspense } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Download,
  GraduationCap,
  Medal,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import {
  getDashboardData,
  getTeacherLeaderboardData,
} from "@/lib/analytics-data";
import type { PeriodFilter } from "@/lib/analytics";
import { formatWibDateTime, getAssessmentStatus } from "@/lib/schedule";
import { getInitials, PODIUM_STYLES } from "@/lib/podium";
import { createPracticeFromTopicAction } from "@/app/guru/actions";
import { FilterBar } from "@/app/guru/filter-bar";
import { PillarChart, TrendChart } from "@/app/guru/dashboard-charts";
import {
  AssessmentCalendar,
  type CalendarAssessmentItem,
} from "@/app/guru/assessment-calendar";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
// Kartu KPI flat & interaktif dengan strip aksen kiri
// ─────────────────────────────────────────────

function AccentKpiCard({
  href,
  label,
  value,
  icon: Icon,
  sub,
  stripClass,
  iconWrapClass,
}: {
  href: string;
  label: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
  stripClass: string;
  iconWrapClass: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl bg-white transition-colors duration-150 hover:bg-slate-50/90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 transition-all duration-150 group-hover:w-2 ${stripClass}`}
      />
      <div className="flex items-center justify-between gap-4 p-4 pl-6">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105 ${iconWrapClass}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
            {value}
          </p>
          {sub && <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// Konten utama dashboard
// ─────────────────────────────────────────────

async function DashboardContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<Record<string, string | undefined>>;
}) {
  const [teacher, searchParams] = await Promise.all([
    requireTeacher(),
    searchParamsPromise,
  ]);
  const now = new Date();

  const filter = parsePeriodFilter(searchParams);
  const selectedClassId = searchParams.classId ? Number(searchParams.classId) : null;
  const searchQuery = (searchParams.q ?? "").trim().toLowerCase();

  const [data, leaderboardGroups] = await Promise.all([
    getDashboardData(teacher.id, filter, selectedClassId, now),
    getTeacherLeaderboardData(teacher.id),
  ]);

  const fmt = (n: number | null, digits = 0) =>
    n === null ? "—" : `${(n * 100).toFixed(digits)}%`;

  const calendarAssessments: CalendarAssessmentItem[] = data.assessments.map((a) => {
    const status =
      a.opensAt && a.closesAt
        ? getAssessmentStatus(a.opensAt, a.closesAt, now)
        : "Dijadwalkan";
    return {
      id: a.id,
      title: a.title,
      opensAt: a.opensAt ? a.opensAt.toISOString() : null,
      closesAt: a.closesAt ? a.closesAt.toISOString() : null,
      topicName: a.topicName,
      status,
      opensAtLabel: a.opensAt ? formatWibDateTime(a.opensAt) : "Belum dijadwalkan",
      closesAtLabel: a.closesAt ? formatWibDateTime(a.closesAt) : "—",
    };
  });

  const agendaAssessments = [...calendarAssessments]
    .sort((a, b) => {
      const rank = { Berlangsung: 0, Dijadwalkan: 1, Ditutup: 2 };
      const diff = rank[a.status] - rank[b.status];
      if (diff !== 0) return diff;
      const aTime = a.opensAt ? new Date(a.opensAt).getTime() : 0;
      const bTime = b.opensAt ? new Date(b.opensAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 3);

  const primaryGroup = leaderboardGroups[0];
  const topThree = primaryGroup ? primaryGroup.ranked.slice(0, 3) : [];

  const trendSerialized = data.trend.map((t) => ({
    ...t,
    opensAt: t.opensAt.toISOString(),
  }));

  const filteredTopics = searchQuery
    ? data.topicDifficulties.filter(
        (td) =>
          td.topicName.toLowerCase().includes(searchQuery) ||
          td.pillarCode.toLowerCase().includes(searchQuery),
      )
    : data.topicDifficulties;

  const filteredStudents = searchQuery
    ? data.studentRows.filter(
        (row) =>
          row.name.toLowerCase().includes(searchQuery) ||
          row.className.toLowerCase().includes(searchQuery) ||
          row.status.toLowerCase().includes(searchQuery),
      )
    : data.studentRows;

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const order = {
      "Perlu Pendampingan": 0,
      Pantau: 1,
      "Belum Cukup Data": 2,
      Aman: 3,
    };
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "id");
  });

  const exportQueryString = new URLSearchParams({
    ...(searchParams.classId ? { classId: searchParams.classId } : {}),
    ...(searchParams.period ? { period: searchParams.period } : {}),
    ...(searchParams.from ? { from: searchParams.from } : {}),
    ...(searchParams.to ? { to: searchParams.to } : {}),
  }).toString();

  const clearSearchParams = new URLSearchParams({
    ...(searchParams.classId ? { classId: searchParams.classId } : {}),
    ...(searchParams.period ? { period: searchParams.period } : {}),
    ...(searchParams.from ? { from: searchParams.from } : {}),
    ...(searchParams.to ? { to: searchParams.to } : {}),
  }).toString();

  return (
    <div className="space-y-8">
      {/* Banner Pencarian Aktif */}
      {searchQuery && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
          <span>
            Menampilkan hasil filter pencarian:{" "}
            <strong className="font-semibold">&ldquo;{searchParams.q}&rdquo;</strong>
          </span>
          <Link
            href={clearSearchParams ? `/guru?${clearSearchParams}` : "/guru"}
            className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            Reset pencarian
          </Link>
        </div>
      )}

      {/* Baris 1: 4 Kartu KPI Flat & Interaktif */}
      <section aria-labelledby="kpi-heading">
        <h1 id="kpi-heading" className="sr-only">
          Ringkasan Dasbor Analitik Guru
        </h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AccentKpiCard
            href="#daftar-siswa"
            label="Total Siswa"
            value={String(data.kpi.totalStudents)}
            icon={Users}
            sub={`${data.classOptions.length} kelas diajar`}
            stripClass="bg-indigo-600"
            iconWrapClass="bg-indigo-600 text-white"
          />
          <AccentKpiCard
            href="/guru/asesmen"
            label="Partisipasi Wajib"
            value={fmt(data.kpi.participationRate)}
            icon={UserCheck}
            sub={
              data.kpi.openAssessmentCount > 0
                ? `${data.kpi.openAssessmentCount} asesmen terbuka`
                : "Belum ada asesmen"
            }
            stripClass="bg-sky-500"
            iconWrapClass="bg-sky-500 text-white"
          />
          <AccentKpiCard
            href="#performa-pilar"
            label="Rata-rata Akurasi"
            value={fmt(data.kpi.avgWajibAccuracy)}
            icon={TrendingUp}
            sub="Khusus asesmen wajib"
            stripClass="bg-emerald-500"
            iconWrapClass="bg-emerald-500 text-white"
          />
          <AccentKpiCard
            href="#daftar-siswa"
            label="Perlu Pendampingan"
            value={String(data.kpi.needsAttentionCount)}
            icon={AlertCircle}
            sub="Prioritas bimbingan"
            stripClass="bg-rose-500"
            iconWrapClass="bg-rose-500 text-white"
          />
        </div>
      </section>

      {/* Baris 2: Filter (GUR-01), Keterlibatan Latihan (GUR-10), & Ekspor CSV (GUR-09) */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl bg-white px-4 py-3.5 lg:flex-row lg:items-end">
        <FilterBar
          classOptions={data.classOptions}
          selectedClassId={searchParams.classId ?? ""}
          selectedPeriod={searchParams.period ?? "all"}
          customFrom={searchParams.from ?? ""}
          customTo={searchParams.to ?? ""}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800">
            <BookOpen className="h-3.5 w-3.5 text-teal-600" />
            <span>
              <strong className="tabular-nums font-bold">
                {data.kpi.practiceSessionCount}
              </strong>{" "}
              Sesi Latihan
            </span>
            <span className="text-teal-700">dan</span>
            <span>
              <strong className="tabular-nums font-bold">
                {data.kpi.practiceStudentCount}
              </strong>{" "}
              Siswa Berlatih
            </span>
          </div>

          <Link href={`/api/ekspor/siswa?${exportQueryString}`}>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            >
              <Download className="h-3.5 w-3.5" />
              Ekspor CSV Siswa
            </Button>
          </Link>
          <Link href={`/api/ekspor/materi?${exportQueryString}`}>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100"
            >
              <Download className="h-3.5 w-3.5" />
              Ekspor CSV Materi
            </Button>
          </Link>
        </div>
      </div>

      {/* Baris 3: Grid 2 Kolom Utama */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Kolom Kiri */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Kalender & Jadwal Asesmen */}
          <Card className="rounded-2xl border-0 bg-white shadow-none">
            <CardHeader className="pb-1">
              <CardTitle className="text-base font-bold text-slate-900">
                Kalender &amp; Jadwal Asesmen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssessmentCalendar
                assessments={calendarAssessments}
                initialNowIso={now.toISOString()}
              />
            </CardContent>
          </Card>

          {/* Agenda Asesmen Terbaru */}
          <Card className="rounded-2xl border-0 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
              <CardTitle className="text-base font-bold text-slate-900">
                Agenda Asesmen
              </CardTitle>
              <Link
                href="/guru/asesmen"
                className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Lihat Semua
              </Link>
            </CardHeader>
            <CardContent>
              {agendaAssessments.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Belum ada asesmen wajib yang dijadwalkan.
                </p>
              ) : (
                <div className="space-y-1">
                  {agendaAssessments.map((item) => (
                    <Link
                      key={item.id}
                      href={`/guru/asesmen/${item.id}`}
                      className="-mx-3 block rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.opensAtLabel}
                          </p>
                        </div>
                        <StatusBadge
                          status={
                            item.status === "Ditutup"
                              ? "Selesai"
                              : item.status === "Berlangsung"
                                ? "Berlangsung"
                                : "Dijadwalkan"
                          }
                        />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                        {item.topicName
                          ? `Materi: ${item.topicName} (${item.opensAtLabel} s.d. ${item.closesAtLabel}).`
                          : `Jendela pengerjaan: ${item.opensAtLabel} s.d. ${item.closesAtLabel}.`}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* GUR-03: Performa per Pilar */}
          <Card
            id="performa-pilar"
            className="scroll-mt-20 rounded-2xl border-0 bg-white shadow-none"
          >
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-1">
              <CardTitle className="text-base font-bold text-slate-900">
                Performa per Pilar
              </CardTitle>
              <span className="text-xs font-medium text-slate-500">
                Klik atau arahkan ke pilar untuk menyorot (%)
              </span>
            </CardHeader>
            <CardContent>
              <PillarChart scores={data.pillarScores} />
            </CardContent>
          </Card>

          {/* GUR-08 Preview: Peraih Skor Tertinggi */}
          <Card className="rounded-2xl border-0 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
              <CardTitle className="text-base font-bold text-slate-900">
                Peraih Skor Tertinggi
              </CardTitle>
              <Link
                href="/guru/peringkat"
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>
                  {primaryGroup
                    ? `Angkatan ${primaryGroup.gradeLevel}: Top 25`
                    : "Lihat Peringkat"}
                </span>
              </Link>
            </CardHeader>
            <CardContent>
              {topThree.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50">
                  <p className="text-sm text-slate-500">
                    Belum ada siswa dengan poin wajib.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {topThree.map((entry, idx) => {
                    const style = PODIUM_STYLES[idx] ?? PODIUM_STYLES[2];
                    return (
                      <Link
                        key={entry.studentId}
                        href={`/guru/siswa/${entry.studentId}`}
                        className={`flex flex-col items-center justify-between rounded-xl p-4 text-center transition-all duration-150 hover:-translate-y-1 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${style.card}`}
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${style.ring}`}
                          >
                            {getInitials(entry.name)}
                          </div>
                          <p className="mt-2 line-clamp-1 text-sm font-bold">
                            {entry.formattedName}
                          </p>
                          <p className={`text-xs ${style.sub}`}>
                            {entry.wajibPoints} Poin Wajib
                          </p>
                        </div>

                        <div className="my-2">
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
              )}
            </CardContent>
          </Card>

          {/* GUR-05: Tren Akurasi ditempatkan di Kolom Kanan agar tinggi kolom seimbang tanpa ruang kosong */}
          <Card className="rounded-2xl border-0 bg-white shadow-none">
            <CardHeader className="pb-1">
              <CardTitle className="text-base font-bold text-slate-900">
                Tren Akurasi per Asesmen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart points={trendSerialized} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Baris 4: Materi Tersulit (GUR-04 + GUR-10) */}
      <Card className="rounded-2xl border-0 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              Tingkat Kesulitan Materi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTopics.length === 0 ? (
              <p className="text-sm text-slate-500">
                {searchQuery
                  ? "Tidak ada materi yang cocok dengan pencarian."
                  : "Belum ada data untuk periode ini."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                      <th className="pb-2 text-left">Materi</th>
                      <th className="pb-2 text-right">Akurasi</th>
                      <th className="pb-2 pl-3 text-left">Kategori</th>
                      <th className="pb-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopics.map((td) => (
                      <tr
                        key={td.topicId}
                        className="border-b border-slate-100/80 transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-2 pr-2">
                          <p className="font-medium text-slate-900">
                            {td.topicName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {td.pillarCode}: {td.totalAnswers} jawaban
                          </p>
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
                          {td.accuracy !== null
                            ? `${(td.accuracy * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="py-2 pl-3">
                          <StatusBadge
                            status={
                              td.category as
                                | "Sulit"
                                | "Sedang"
                                | "Mudah"
                                | "Data belum cukup"
                            }
                          />
                        </td>
                        <td className="py-2 text-right">
                          {(td.category === "Sulit" ||
                            td.category === "Sedang") && (
                            <form action={createPracticeFromTopicAction}>
                              <input
                                type="hidden"
                                name="topicId"
                                value={td.topicId}
                              />
                              <input
                                type="hidden"
                                name="classId"
                                value={selectedClassId ?? ""}
                              />
                              <Button
                                type="submit"
                                variant="secondary"
                                size="sm"
                                className="rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95"
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

      {/* Baris 5: Tabel Daftar Siswa (GUR-06) */}
      <Card
        id="daftar-siswa"
        className="scroll-mt-20 rounded-2xl border-0 bg-white shadow-none"
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-bold text-slate-900">
            Daftar Siswa ({sortedStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStudents.length === 0 ? (
            <p className="text-sm text-slate-500">
              {searchQuery
                ? "Tidak ada siswa yang cocok dengan pencarian."
                : "Belum ada siswa."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="pb-2 text-left">Nama</th>
                    <th className="pb-2 text-left">Kelas</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-right">Jawaban</th>
                    <th className="pb-2 text-right">Akurasi</th>
                    <th className="pb-2 text-right">Poin Wajib</th>
                    <th className="pb-2 text-right">Latihan</th>
                    <th className="pb-2 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((row) => (
                    <tr
                      key={row.studentId}
                      className="border-b border-slate-100/80 transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-2 font-medium text-slate-900">
                        {row.name}
                      </td>
                      <td className="py-2 text-slate-600">{row.className}</td>
                      <td className="py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-600">
                        {row.totalAnswers}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-900">
                        {row.overallAccuracy !== null
                          ? `${(row.overallAccuracy * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-900">
                        {row.wajibPoints}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-600">
                        {row.practiceSessions}
                      </td>
                      <td className="py-2 text-right">
                        <Link href={`/guru/siswa/${row.studentId}`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-lg bg-slate-100 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 active:scale-95"
                          >
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

export default function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-slate-500">Memuat dasbor analitik...</div>
      }
    >
      <DashboardContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
