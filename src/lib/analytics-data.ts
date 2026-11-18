/**
 * analytics-data.ts – Server-side data fetching untuk dashboard guru (Fase 3).
 * Mengambil data dari DB dan meneruskan ke fungsi murni di analytics.ts.
 * Hanya dipanggil dari Server Component / Server Action.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  PeriodFilter,
  RawAnswerWithSession,
  RawAssessment,
} from "@/lib/analytics";
import {
  applyPeriodFilter,
  computeTopicDifficulties,
  computeStudentStatus,
  computePillarScores,
  computeTrendExtended,
  computeKpi,
} from "@/lib/analytics";
import { sortAndRankLeaderboard } from "@/lib/scoring";

// ─────────────────────────────────────────────
// Tipe hasil gabungan untuk dashboard
// ─────────────────────────────────────────────

export interface DashboardData {
  // Filter metadata
  classOptions: { id: number; name: string }[];
  selectedClassId: number | null; // null = semua kelas

  // KPI
  kpi: {
    totalStudents: number;
    participationRate: number | null;
    avgWajibAccuracy: number | null;
    needsAttentionCount: number;
    practiceSessionCount: number;
    practiceStudentCount: number;
    openAssessmentCount: number;
  };

  // Skor pilar
  pillarScores: {
    pillarCode: string;
    pillarName: string;
    accuracy: number | null;
    totalAnswers: number;
  }[];

  // Materi tersulit
  topicDifficulties: {
    topicId: number;
    topicName: string;
    pillarCode: string;
    accuracy: number | null;
    category: "Sulit" | "Sedang" | "Mudah" | "Data belum cukup";
    totalAnswers: number;
    sourceAssessmentId: number | null; // untuk tombol "Buat latihan"
  }[];

  // Tren
  trend: {
    assessmentId: number;
    assessmentTitle: string;
    topicName: string | null;
    opensAt: Date;
    accuracy: number;
    participantCount: number;
  }[];

  // Jadwal asesmen WAJIB angkatan guru
  assessments: {
    id: number;
    title: string;
    description: string | null;
    opensAt: Date | null;
    closesAt: Date | null;
    topicName: string | null;
    pillarCode: string | null;
  }[];

  // Tabel siswa
  studentRows: {
    studentId: number;
    name: string;
    className: string;
    status: "Perlu Pendampingan" | "Pantau" | "Belum Cukup Data" | "Aman";
    weakTopics: string[];
    totalAnswers: number;
    overallAccuracy: number | null;
    totalPoints: number;
    wajibPoints: number;
    practiceSessions: number;
    lastActive: Date | null;
  }[];
}

// ─────────────────────────────────────────────
// Fungsi utama: ambil semua data dashboard
// ─────────────────────────────────────────────

export async function getDashboardData(
  teacherId: number,
  filter: PeriodFilter,
  selectedClassId: number | null,
  now: Date,
): Promise<DashboardData> {
  // 1. Kelas yang diajar guru
  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId },
    include: { class: { select: { id: true, name: true, gradeLevel: true } } },
    orderBy: { class: { name: "asc" } },
  });
  const classOptions = teacherClasses.map((tc) => ({
    id: tc.class.id,
    name: tc.class.name,
  }));
  const classIds = teacherClasses.map((tc) => tc.class.id);
  const gradeLevels = [...new Set(teacherClasses.map((tc) => tc.class.gradeLevel))];

  // Filter kelas
  const targetClassIds = selectedClassId ? [selectedClassId] : classIds;

  // 2..4. Ambil siswa, pilar, topik, dan asesmen WAJIB secara paralel
  const [studentProfiles, pillars, topics, wajibAssessments] =
    await Promise.all([
      prisma.studentProfile.findMany({
        where: { classId: { in: targetClassIds } },
        include: {
          user: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
        },
      }),
      prisma.pillar.findMany({
        orderBy: { id: "asc" },
      }),
      prisma.topic.findMany({
        where: { gradeLevel: { in: gradeLevels } },
        include: { pillar: { select: { code: true, name: true } } },
      }),
      prisma.assessment.findMany({
        where: {
          type: "WAJIB",
          gradeLevel: { in: gradeLevels },
          isActive: true,
        },
        include: {
          sourceTopic: {
            include: { pillar: { select: { code: true } } },
          },
        },
        orderBy: { opensAt: "asc" },
      }),
    ]);

  const studentIds = studentProfiles.map((sp) => sp.userId);
  const studentMap = new Map(
    studentProfiles
      .map((sp) => ({
        id: sp.userId,
        name: sp.user.name,
        className: sp.class.name,
        classId: sp.class.id,
      }))
      .map((s) => [s.id, s]),
  );

  const topicToPillar = new Map(topics.map((t) => [t.id, t.pillar.code]));
  const topicList = topics.map((t) => ({
    id: t.id,
    name: t.name,
    pillarCode: t.pillar.code,
  }));
  const topicNames = topics.map((t) => ({ id: t.id, name: t.name }));

  const rawAssessments: RawAssessment[] = wajibAssessments.map((a) => ({
    id: a.id,
    title: a.title,
    opensAt: a.opensAt,
    closesAt: a.closesAt,
    gradeLevel: a.gradeLevel,
    sourceTopicId: a.sourceTopicId,
    topicName: a.sourceTopic?.name ?? null,
    pillarCode: a.sourceTopic?.pillar.code ?? null,
  }));

  // 5..8. Ambil sesi WAJIB, jawaban WAJIB, sesi LATIHAN, dan poin secara paralel
  const [wajibSessions, wajibAnswersRaw, practiceSessions, pointEvents] =
    await Promise.all([
      prisma.assessmentSession.findMany({
        where: {
          studentId: { in: studentIds },
          kind: "WAJIB",
          finishedAt: { not: null },
        },
        select: {
          id: true,
          studentId: true,
          assessmentId: true,
          finishedAt: true,
        },
      }),
      prisma.answer.findMany({
        where: {
          studentId: { in: studentIds },
          session: { kind: "WAJIB" },
        },
        select: {
          id: true,
          studentId: true,
          questionId: true,
          isCorrect: true,
          answeredAt: true,
          sessionId: true,
          session: { select: { assessmentId: true } },
          question: { select: { topicId: true } },
        },
      }),
      prisma.assessmentSession.findMany({
        where: {
          studentId: { in: studentIds },
          kind: "LATIHAN",
          finishedAt: { not: null },
        },
        select: { id: true, studentId: true, finishedAt: true },
      }),
      prisma.pointEvent.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, type: true, points: true },
      }),
    ]);

  // Buat RawAnswerWithSession, lalu filter periode berdasarkan answeredAt
  const allAnswersWithSession: RawAnswerWithSession[] = wajibAnswersRaw.map((a) => ({
    studentId: a.studentId,
    questionId: a.questionId,
    topicId: a.question.topicId,
    isCorrect: a.isCorrect,
    answeredAt: a.answeredAt,
    sessionId: a.sessionId,
    assessmentId: a.session.assessmentId,
  }));

  const filteredAnswers = allAnswersWithSession.filter((a) =>
    applyPeriodFilter(a.answeredAt, filter, now),
  );

  // Asesmen yang opensAt dalam periode (untuk KPI partisipasi)
  const openAssessmentsInPeriod = wajibAssessments.filter(
    (a) => a.opensAt !== null && applyPeriodFilter(a.opensAt, filter, now),
  );
  const openAssessmentIds = new Set(openAssessmentsInPeriod.map((a) => a.id));

  // Sesi WAJIB selesai dalam periode (berdasarkan answeredAt dari jawaban terakhir)
  const sessionsWithAnswersInPeriod = new Set(filteredAnswers.map((a) => a.sessionId));
  const completedWajibSessionsByStudent = new Map<number, number[]>();
  for (const s of wajibSessions) {
    if (!sessionsWithAnswersInPeriod.has(s.id)) continue;
    if (s.assessmentId === null || !openAssessmentIds.has(s.assessmentId)) continue;
    const arr = completedWajibSessionsByStudent.get(s.studentId) ?? [];
    arr.push(s.assessmentId);
    completedWajibSessionsByStudent.set(s.studentId, arr);
  }

  const filteredPracticeSessions = practiceSessions.filter((s) =>
    s.finishedAt && applyPeriodFilter(s.finishedAt, filter, now),
  );
  const practiceStudentIds = new Set(filteredPracticeSessions.map((s) => s.studentId));

  const totalPointsMap = new Map<number, number>();
  const wajibPointsMap = new Map<number, number>();
  for (const pe of pointEvents) {
    totalPointsMap.set(pe.studentId, (totalPointsMap.get(pe.studentId) ?? 0) + pe.points);
    if (pe.type === "WAJIB_ANSWER" || pe.type === "WAJIB_BONUS") {
      wajibPointsMap.set(pe.studentId, (wajibPointsMap.get(pe.studentId) ?? 0) + pe.points);
    }
  }

  // 9. Terakhir aktif (answeredAt terbaru dari sesi WAJIB atau LATIHAN)
  const lastActiveMap = new Map<number, Date>();
  for (const a of wajibAnswersRaw) {
    const prev = lastActiveMap.get(a.studentId);
    if (!prev || a.answeredAt > prev) lastActiveMap.set(a.studentId, a.answeredAt);
  }
  for (const s of practiceSessions) {
    if (!s.finishedAt) continue;
    const prev = lastActiveMap.get(s.studentId);
    if (!prev || s.finishedAt > prev) lastActiveMap.set(s.studentId, s.finishedAt);
  }

  // ── Kalkulasi ──────────────────────────────────────────────────────────────

  // Status siswa (dari jawaban WAJIB yang terfilter, bukan semua waktu)
  const studentRows = studentIds.map((sid) => {
    const studentAnswers = filteredAnswers.filter((a) => a.studentId === sid);
    const statusResult = computeStudentStatus(sid, studentAnswers, topicNames);
    const info = studentMap.get(sid);
    const practiceSess = filteredPracticeSessions.filter((s) => s.studentId === sid).length;

    return {
      studentId: sid,
      name: info?.name ?? "",
      className: info?.className ?? "",
      status: statusResult.status,
      weakTopics: statusResult.weakTopics,
      totalAnswers: statusResult.totalAnswers,
      overallAccuracy: statusResult.overallAccuracy,
      totalPoints: totalPointsMap.get(sid) ?? 0,
      wajibPoints: wajibPointsMap.get(sid) ?? 0,
      practiceSessions: practiceSess,
      lastActive: lastActiveMap.get(sid) ?? null,
    };
  });

  const needsAttentionCount = studentRows.filter((r) => r.status === "Perlu Pendampingan").length;

  // KPI
  const kpiResult = computeKpi({
    totalStudents: studentIds.length,
    completedWajibSessionsByStudent,
    wajibAnswers: filteredAnswers,
    openAssessmentCount: openAssessmentsInPeriod.length,
    needsAttentionCount,
    practiceSessionCount: filteredPracticeSessions.length,
    practiceStudentCount: practiceStudentIds.size,
  });

  // Pilar
  const pillarScores = computePillarScores(filteredAnswers, pillars, topicToPillar);

  // Materi tersulit
  const topicDifficulties = computeTopicDifficulties(filteredAnswers, topicList);
  // Tambahkan sourceAssessmentId (untuk tombol "Buat latihan")
  const topicToAssessmentId = new Map<number, number>();
  for (const a of wajibAssessments) {
    if (a.sourceTopicId !== null) topicToAssessmentId.set(a.sourceTopicId, a.id);
  }
  const topicDifficultiesWithAsm = topicDifficulties.map((td) => ({
    ...td,
    sourceAssessmentId: topicToAssessmentId.get(td.topicId) ?? null,
  }));

  // Tren (hanya asesmen yang opensAt dalam periode)
  const filteredAssessmentsForTrend = rawAssessments.filter(
    (a) => a.opensAt !== null && applyPeriodFilter(a.opensAt, filter, now),
  );
  const trend = computeTrendExtended(filteredAnswers, filteredAssessmentsForTrend);

  return {
    classOptions,
    selectedClassId,
    kpi: kpiResult,
    pillarScores,
    topicDifficulties: topicDifficultiesWithAsm,
    trend,
    assessments: wajibAssessments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      opensAt: a.opensAt,
      closesAt: a.closesAt,
      topicName: a.sourceTopic?.name ?? null,
      pillarCode: a.sourceTopic?.pillar.code ?? null,
    })),
    studentRows,
  };
}

// ─────────────────────────────────────────────
// Data untuk peringkat guru (GUR-08)
// ─────────────────────────────────────────────

export async function getTeacherLeaderboardData(teacherId: number) {
  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId },
    include: { class: { select: { id: true, gradeLevel: true } } },
  });
  const gradeLevels = [...new Set(teacherClasses.map((tc) => tc.class.gradeLevel))];
  const classIds = teacherClasses.map((tc) => tc.class.id);

  const studentProfiles = await prisma.studentProfile.findMany({
    where: { classId: { in: classIds } },
    include: {
      user: { select: { id: true, name: true } },
      class: { select: { name: true } },
    },
  });
  const studentIds = studentProfiles.map((sp) => sp.userId);

  // Agregasi poin WAJIB dan akurasi WAJIB langsung di MySQL secara paralel (D-07)
  const [pointSums, answerGroups] = await Promise.all([
    prisma.pointEvent.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: studentIds },
        type: { in: ["WAJIB_ANSWER", "WAJIB_BONUS"] },
      },
      _sum: { points: true },
    }),
    prisma.answer.groupBy({
      by: ["studentId", "isCorrect"],
      where: {
        studentId: { in: studentIds },
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

  const candidates = studentProfiles.map((sp) => {
    const pts = wajibPointsMap.get(sp.userId) ?? 0;
    const acc = wajibAccuracyMap.get(sp.userId);
    return {
      studentId: sp.userId,
      name: sp.user.name,
      className: sp.class.name,
      wajibPoints: pts,
      wajibAccuracy: acc && acc.total > 0 ? acc.correct / acc.total : 0,
    };
  });

  // Per grade level
  const result: { gradeLevel: number; ranked: ReturnType<typeof sortAndRankLeaderboard> }[] = [];
  for (const gl of gradeLevels.sort()) {
    const glClassIds = teacherClasses
      .filter((tc) => tc.class.gradeLevel === gl)
      .map((tc) => tc.class.id);
    const glCandidates = candidates.filter((c) => {
      const sp = studentProfiles.find((s) => s.userId === c.studentId);
      return sp && glClassIds.includes(sp.classId);
    });
    result.push({ gradeLevel: gl, ranked: sortAndRankLeaderboard(glCandidates) });
  }

  return result;
}

// ─────────────────────────────────────────────
// Data untuk ekspor CSV (GUR-09)
// ─────────────────────────────────────────────

export async function getExportStudentData(
  teacherId: number,
  filter: PeriodFilter,
  selectedClassId: number | null,
  now: Date,
) {
  const data = await getDashboardData(teacherId, filter, selectedClassId, now);

  // Hitung wajib diikuti per siswa
  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId },
    include: { class: { select: { gradeLevel: true } } },
  });
  const gradeLevels = [...new Set(teacherClasses.map((tc) => tc.class.gradeLevel))];
  const totalWajibCount = await prisma.assessment.count({
    where: {
      type: "WAJIB",
      gradeLevel: { in: gradeLevels },
      isActive: true,
    },
  });

  // Sesi WAJIB per siswa (semua waktu untuk "wajib diikuti")
  const studentIds = data.studentRows.map((r) => r.studentId);
  const wajibSessionCounts = await prisma.assessmentSession.groupBy({
    by: ["studentId"],
    where: {
      studentId: { in: studentIds },
      kind: "WAJIB",
      finishedAt: { not: null },
    },
    _count: { id: true },
  });
  const wajibDoneMap = new Map(wajibSessionCounts.map((r) => [r.studentId, r._count.id]));

  return {
    rows: data.studentRows.map((r) => ({
      ...r,
      wajibDone: wajibDoneMap.get(r.studentId) ?? 0,
      totalWajib: totalWajibCount,
    })),
  };
}

export async function getExportTopicData(
  teacherId: number,
  filter: PeriodFilter,
  selectedClassId: number | null,
  now: Date,
) {
  const data = await getDashboardData(teacherId, filter, selectedClassId, now);
  return data.topicDifficulties;
}
