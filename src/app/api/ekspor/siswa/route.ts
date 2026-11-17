import { requireTeacher } from "@/lib/auth";
import { getExportStudentData } from "@/lib/analytics-data";
import { buildCsv } from "@/lib/analytics";
import type { PeriodFilter } from "@/lib/analytics";
import { calculateLevel } from "@/lib/scoring";
import { formatWibDateTime } from "@/lib/schedule";

function parsePeriodFilter(params: URLSearchParams): PeriodFilter {
  const p = params.get("period") ?? "all";
  if (p === "7") return { kind: "days", days: 7 };
  if (p === "30") return { kind: "days", days: 30 };
  const from = params.get("from");
  const to = params.get("to");
  if (p === "custom" && from && to) {
    return {
      kind: "custom",
      from: new Date(from + "T00:00:00+07:00"),
      to: new Date(to + "T23:59:59+07:00"),
    };
  }
  return { kind: "all" };
}

export async function GET(request: Request) {
  const teacher = await requireTeacher();
  const url = new URL(request.url);
  const params = url.searchParams;

  const filter = parsePeriodFilter(params);
  const classIdParam = params.get("classId");
  const selectedClassId = classIdParam ? Number(classIdParam) : null;
  const now = new Date();

  const { rows } = await getExportStudentData(teacher.id, filter, selectedClassId, now);

  const headers = [
    "Nama",
    "Kelas",
    "Total Poin",
    "Poin Wajib",
    "Level",
    "Wajib Diikuti",
    "Jumlah Jawaban Wajib",
    "Akurasi Wajib (%)",
    "Status",
    "Materi Lemah",
    "Jumlah Sesi Latihan",
    "Terakhir Aktif",
  ];

  const dataRows = rows.map((r) => {
    const levelInfo = calculateLevel(r.totalPoints);
    const wajibDiikuti = `${r.wajibDone}/${r.totalWajib}`;
    const akurasi =
      r.overallAccuracy !== null ? (r.overallAccuracy * 100).toFixed(1) : "";
    const materiLemah = r.weakTopics.join("; ");
    const terakhirAktif = r.lastActive ? formatWibDateTime(r.lastActive) : "";

    return [
      r.name,
      r.className,
      r.totalPoints,
      r.wajibPoints,
      levelInfo.level,
      wajibDiikuti,
      r.totalAnswers,
      akurasi,
      r.status,
      materiLemah,
      r.practiceSessions,
      terakhirAktif,
    ];
  });

  const csv = buildCsv(headers, dataRows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="literasik-siswa-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
