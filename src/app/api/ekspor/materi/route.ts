import { requireTeacher } from "@/lib/auth";
import { getExportTopicData } from "@/lib/analytics-data";
import { buildCsv } from "@/lib/analytics";
import type { PeriodFilter } from "@/lib/analytics";

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

  const topicData = await getExportTopicData(teacher.id, filter, selectedClassId, now);

  // Perlu angkatan (gradeLevel) – ambil dari context guru
  // Kita pakai pillarCode sebagai proxy untuk pilar
  const headers = [
    "Pilar",
    "Materi",
    "Jumlah Jawaban",
    "Akurasi (%)",
    "Kategori",
  ];

  const dataRows = topicData.map((td) => [
    td.pillarCode,
    td.topicName,
    td.totalAnswers,
    td.accuracy !== null ? (td.accuracy * 100).toFixed(1) : "",
    td.category,
  ]);

  const csv = buildCsv(headers, dataRows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="literasik-materi-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
