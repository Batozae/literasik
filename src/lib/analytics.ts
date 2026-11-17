/**
 * analytics.ts – Fungsi murni untuk kalkulasi analitik dashboard guru (Fase 3).
 * Semua kalkulasi HANYA dari sesi WAJIB (D-01).
 * Tidak ada impor Prisma di sini; data di-pass dari server action/page.
 */

import {
  HARD_TOPIC_THRESHOLD,
  EASY_TOPIC_THRESHOLD,
  WEAK_TOPIC_THRESHOLD,
  WEAK_STUDENT_TOPIC_COUNT,
  LOW_OVERALL_THRESHOLD,
  MIN_ANSWERS_STUDENT_TOPIC,
  MIN_ANSWERS_OVERALL,
  MIN_ANSWERS_TOPIC_COHORT,
} from "@/lib/config";

// ─────────────────────────────────────────────
// Tipe data mentah (dari DB, sudah difilter ke sesi WAJIB)
// ─────────────────────────────────────────────

export interface RawAnswer {
  studentId: number;
  questionId: number;
  topicId: number;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface RawSession {
  id: number;
  studentId: number;
  assessmentId: number | null;
  finishedAt: Date | null;
}

export interface RawAssessment {
  id: number;
  title: string;
  opensAt: Date | null;
  closesAt: Date | null;
  gradeLevel: number;
  sourceTopicId: number | null;
  topicName: string | null;   // nama materi dari sourceTopic
  pillarCode: string | null;  // kode pilar dari sourceTopic.pillar
}

// ─────────────────────────────────────────────
// Filter periode
// ─────────────────────────────────────────────

export type PeriodFilter =
  | { kind: "days"; days: number }
  | { kind: "all" }
  | { kind: "custom"; from: Date; to: Date };

export function applyPeriodFilter(answeredAt: Date, filter: PeriodFilter, now: Date): boolean {
  if (filter.kind === "all") return true;
  if (filter.kind === "days") {
    const cutoff = new Date(now.getTime() - filter.days * 24 * 60 * 60 * 1000);
    return answeredAt >= cutoff;
  }
  return answeredAt >= filter.from && answeredAt <= filter.to;
}

// ─────────────────────────────────────────────
// D-02: Kategori materi (per materi, semua siswa dalam filter)
// ─────────────────────────────────────────────

export type TopicCategory = "Sulit" | "Sedang" | "Mudah" | "Data belum cukup";

export interface TopicDifficulty {
  topicId: number;
  topicName: string;
  pillarCode: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number | null; // null jika belum cukup data
  category: TopicCategory;
}

export function computeTopicDifficulties(
  answers: RawAnswer[],
  topics: { id: number; name: string; pillarCode: string }[],
): TopicDifficulty[] {
  // Hitung akurasi per topicId dari jawaban yang sudah difilter
  const topicStats = new Map<number, { total: number; correct: number }>();
  for (const a of answers) {
    const s = topicStats.get(a.topicId) ?? { total: 0, correct: 0 };
    s.total++;
    if (a.isCorrect) s.correct++;
    topicStats.set(a.topicId, s);
  }

  return topics.map((t) => {
    const stats = topicStats.get(t.id) ?? { total: 0, correct: 0 };
    if (stats.total < MIN_ANSWERS_TOPIC_COHORT) {
      return {
        topicId: t.id,
        topicName: t.name,
        pillarCode: t.pillarCode,
        totalAnswers: stats.total,
        correctAnswers: stats.correct,
        accuracy: null,
        category: "Data belum cukup" as TopicCategory,
      };
    }
    const accuracy = stats.correct / stats.total;
    let category: TopicCategory;
    if (accuracy < HARD_TOPIC_THRESHOLD) category = "Sulit";
    else if (accuracy < EASY_TOPIC_THRESHOLD) category = "Sedang";
    else category = "Mudah";

    return {
      topicId: t.id,
      topicName: t.name,
      pillarCode: t.pillarCode,
      totalAnswers: stats.total,
      correctAnswers: stats.correct,
      accuracy,
      category,
    };
  }).sort((a, b) => {
    // Urut dari akurasi terendah; Data belum cukup di bawah
    if (a.accuracy === null && b.accuracy === null) return 0;
    if (a.accuracy === null) return 1;
    if (b.accuracy === null) return -1;
    return a.accuracy - b.accuracy;
  });
}

// ─────────────────────────────────────────────
// D-03: Status siswa
// ─────────────────────────────────────────────

export type StudentStatus = "Perlu Pendampingan" | "Pantau" | "Belum Cukup Data" | "Aman";

export interface StudentStatusResult {
  studentId: number;
  status: StudentStatus;
  weakTopics: string[]; // nama materi lemah
  totalAnswers: number;
  correctAnswers: number;
  overallAccuracy: number | null;
}

export function computeStudentStatus(
  studentId: number,
  answers: RawAnswer[], // sudah difilter ke sesi WAJIB + periode + kelas
  topics: { id: number; name: string }[],
): StudentStatusResult {
  const topicMap = new Map(topics.map((t) => [t.id, t.name]));

  // Hitung per topik
  const topicStats = new Map<number, { total: number; correct: number }>();
  let totalAnswers = 0;
  let correctAnswers = 0;

  for (const a of answers) {
    if (a.studentId !== studentId) continue;
    totalAnswers++;
    if (a.isCorrect) correctAnswers++;

    const s = topicStats.get(a.topicId) ?? { total: 0, correct: 0 };
    s.total++;
    if (a.isCorrect) s.correct++;
    topicStats.set(a.topicId, s);
  }

  // Materi lemah: akurasi < 60% dengan >= 3 jawaban
  const weakTopics: string[] = [];
  for (const [topicId, s] of topicStats) {
    if (s.total >= MIN_ANSWERS_STUDENT_TOPIC && s.correct / s.total < WEAK_TOPIC_THRESHOLD) {
      weakTopics.push(topicMap.get(topicId) ?? `Materi #${topicId}`);
    }
  }

  const overallAccuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : null;

  // Belum Cukup Data: tidak ada topik dengan >= 3 jawaban DAN total < 10
  const hasAnyTopicWithMin = [...topicStats.values()].some((s) => s.total >= MIN_ANSWERS_STUDENT_TOPIC);
  if (!hasAnyTopicWithMin && totalAnswers < MIN_ANSWERS_OVERALL) {
    return { studentId, status: "Belum Cukup Data", weakTopics: [], totalAnswers, correctAnswers, overallAccuracy };
  }

  // Perlu Pendampingan: materi lemah >= 2 ATAU (total >= 10 dan akurasi < 50%)
  if (
    weakTopics.length >= WEAK_STUDENT_TOPIC_COUNT ||
    (totalAnswers >= MIN_ANSWERS_OVERALL && overallAccuracy !== null && overallAccuracy < LOW_OVERALL_THRESHOLD)
  ) {
    return { studentId, status: "Perlu Pendampingan", weakTopics, totalAnswers, correctAnswers, overallAccuracy };
  }

  // Pantau: tepat 1 materi lemah
  if (weakTopics.length === 1) {
    return { studentId, status: "Pantau", weakTopics, totalAnswers, correctAnswers, overallAccuracy };
  }

  return { studentId, status: "Aman", weakTopics, totalAnswers, correctAnswers, overallAccuracy };
}

// ─────────────────────────────────────────────
// D-08: KPI
// ─────────────────────────────────────────────

export interface KpiResult {
  totalStudents: number;
  participationRate: number | null; // null jika tidak ada asesmen wajib terbuka di periode
  avgWajibAccuracy: number | null;
  needsAttentionCount: number;
  practiceSessionCount: number;      // jumlah sesi latihan (GUR-10)
  practiceStudentCount: number;      // jumlah siswa yang berlatih (GUR-10)
  openAssessmentCount: number;       // jumlah asesmen wajib terbuka di periode
}

export interface KpiInput {
  totalStudents: number;
  // Sesi WAJIB selesai dalam periode per studentId
  completedWajibSessionsByStudent: Map<number, number[]>; // studentId -> assessmentIds selesai
  // Semua jawaban sesi WAJIB dalam filter
  wajibAnswers: RawAnswer[];
  // Asesmen WAJIB yang opensAt dalam periode filter
  openAssessmentCount: number;
  needsAttentionCount: number;
  // GUR-10: sesi latihan dalam filter (dari kelas guru, semua sesi LATIHAN)
  practiceSessionCount: number;
  practiceStudentCount: number;
}

export function computeKpi(input: KpiInput): KpiResult {
  const {
    totalStudents,
    completedWajibSessionsByStudent,
    wajibAnswers,
    openAssessmentCount,
    needsAttentionCount,
    practiceSessionCount,
    practiceStudentCount,
  } = input;

  // Partisipasi: sesi WAJIB selesai / (asesmen wajib terbuka * jumlah siswa)
  const totalExpected = openAssessmentCount * totalStudents;
  let totalCompleted = 0;
  for (const sessions of completedWajibSessionsByStudent.values()) {
    totalCompleted += sessions.length;
  }
  const participationRate = totalExpected > 0 ? totalCompleted / totalExpected : null;

  // Rata-rata akurasi WAJIB
  const totalWajibAnswers = wajibAnswers.length;
  const correctWajibAnswers = wajibAnswers.filter((a) => a.isCorrect).length;
  const avgWajibAccuracy = totalWajibAnswers > 0 ? correctWajibAnswers / totalWajibAnswers : null;

  return {
    totalStudents,
    participationRate,
    avgWajibAccuracy,
    needsAttentionCount,
    practiceSessionCount,
    practiceStudentCount,
    openAssessmentCount,
  };
}

// ─────────────────────────────────────────────
// D-08: Skor pilar (rata-rata akurasi per pilar)
// ─────────────────────────────────────────────

export interface PillarScore {
  pillarCode: string;
  pillarName: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number | null; // null jika tidak ada data
}

export function computePillarScores(
  answers: RawAnswer[],
  pillars: { code: string; name: string }[],
  topicToPillar: Map<number, string>, // topicId -> pillarCode
): PillarScore[] {
  const pillarStats = new Map<string, { total: number; correct: number }>();

  for (const a of answers) {
    const pillarCode = topicToPillar.get(a.topicId);
    if (!pillarCode) continue;
    const s = pillarStats.get(pillarCode) ?? { total: 0, correct: 0 };
    s.total++;
    if (a.isCorrect) s.correct++;
    pillarStats.set(pillarCode, s);
  }

  return pillars.map((p) => {
    const s = pillarStats.get(p.code) ?? { total: 0, correct: 0 };
    return {
      pillarCode: p.code,
      pillarName: p.name,
      totalAnswers: s.total,
      correctAnswers: s.correct,
      accuracy: s.total > 0 ? s.correct / s.total : null,
    };
  });
}

// ─────────────────────────────────────────────
// D-08: Tren akurasi per asesmen WAJIB
// ─────────────────────────────────────────────

export interface TrendPoint {
  assessmentId: number;
  assessmentTitle: string;
  topicName: string | null;
  opensAt: Date;
  accuracy: number; // 0..1
  participantCount: number;
}

export function computeTrend(
  answers: RawAnswer[],
  sessions: RawSession[], // sesi WAJIB selesai dalam filter
  assessments: RawAssessment[],
): TrendPoint[] {
  // Map sessionId -> assessmentId
  const sessionToAssessment = new Map<number, number>();
  for (const s of sessions) {
    if (s.assessmentId !== null) sessionToAssessment.set(s.id, s.assessmentId);
  }

  // Hitung per assessmentId
  const assessmentStats = new Map<number, { total: number; correct: number; students: Set<number> }>();
  for (const a of answers) {
    // Cari sesi yang dimiliki jawaban ini – kita butuh sessionId, tapi RawAnswer tidak punya.
    // Solusi: aggregate langsung dari answers yang sudah dikelompokkan oleh assessmentId
    // (Pemanggil meneruskan answers yang sudah difilter ke sesi WAJIB + periode)
    // Gunakan topicId → assessmentId via sessions map
    // Note: RawAnswer hanya punya studentId + topicId. Kita tidak tahu sessionId.
    // Pemanggil wajib pass answers dengan field assessmentId tambahan.
    // Lihat RawAnswerWithAssessment di bawah.
    void a; // placeholder
  }
  void assessmentStats;

  // Gunakan tipe yang lebih lengkap (lihat computeTrendFromExtended)
  return [];
}

export interface RawAnswerWithSession {
  studentId: number;
  questionId: number;
  topicId: number;
  isCorrect: boolean;
  answeredAt: Date;
  sessionId: number;
  assessmentId: number | null; // dari session.assessmentId
}

export function computeTrendExtended(
  answers: RawAnswerWithSession[],
  assessments: RawAssessment[],
): TrendPoint[] {
  const assessmentStats = new Map<number, { total: number; correct: number; students: Set<number> }>();

  for (const a of answers) {
    if (a.assessmentId === null) continue;
    const s = assessmentStats.get(a.assessmentId) ?? { total: 0, correct: 0, students: new Set() };
    s.total++;
    if (a.isCorrect) s.correct++;
    s.students.add(a.studentId);
    assessmentStats.set(a.assessmentId, s);
  }

  const points: TrendPoint[] = [];
  for (const asm of assessments) {
    if (!asm.opensAt) continue;
    const stats = assessmentStats.get(asm.id);
    if (!stats || stats.total === 0) continue;
    points.push({
      assessmentId: asm.id,
      assessmentTitle: asm.title,
      topicName: asm.topicName,
      opensAt: asm.opensAt,
      accuracy: stats.correct / stats.total,
      participantCount: stats.students.size,
    });
  }

  // Urut berdasarkan opensAt
  return points.sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime());
}

// ─────────────────────────────────────────────
// Ekspor CSV helper (D-09)
// ─────────────────────────────────────────────

/** Sanitasi sel CSV: awali dengan ' jika mulai dengan =, +, -, @ (formula injection) */
export function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

/** Buat baris CSV dari array nilai; pisahkan dengan koma, kutip jika ada koma/newline */
export function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const str = v === null || v === undefined ? "" : String(v);
      const sanitized = sanitizeCsvCell(str);
      // Kutip jika ada koma, tanda kutip, atau newline
      if (/[",\n\r]/.test(sanitized)) {
        return `"${sanitized.replace(/"/g, '""')}"`;
      }
      return sanitized;
    })
    .join(",");
}

/** Tambahkan BOM UTF-8 dan gabungkan baris CSV */
export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const BOM = "\uFEFF";
  const lines = [toCsvRow(headers), ...rows.map(toCsvRow)].join("\r\n");
  return BOM + lines;
}
