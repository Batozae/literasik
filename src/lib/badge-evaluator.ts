import { prisma } from "@/lib/prisma";
import {
  evaluateBadges,
  type CompletedSessionSummary,
  type PillarAssessmentInfo,
} from "@/lib/scoring";

export async function evaluateAndAwardBadges(
  studentId: number,
  now: Date = new Date(),
): Promise<string[]> {
  // 1. Ambil profil siswa dan angkatannya
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    include: { class: true },
  });
  if (!profile) return [];
  const gradeLevel = profile.class.gradeLevel;

  // 2. Ambil semua sesi selesai milik siswa
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      studentId,
      finishedAt: { not: null },
    },
    include: {
      assessment: {
        include: {
          sourceTopic: { include: { pillar: true } },
          questions: {
            include: {
              question: {
                include: { topic: { include: { pillar: true } } },
              },
            },
          },
        },
      },
      answers: true,
    },
  });

  const completedSessions: CompletedSessionSummary[] = sessions.map((s) => {
    const totalQuestions = s.assessment?.questions.length ?? 0;
    const correctAnswers = s.answers.filter((a) => a.isCorrect).length;
    const allCorrect =
      totalQuestions > 0 &&
      correctAnswers === totalQuestions &&
      s.answers.length === totalQuestions;

    let pillarCode: string | null = null;
    if (s.assessment?.sourceTopic?.pillar.code) {
      pillarCode = s.assessment.sourceTopic.pillar.code;
    } else if (s.assessment?.questions[0]?.question.topic.pillar.code) {
      pillarCode = s.assessment.questions[0].question.topic.pillar.code;
    }

    return {
      sessionId: s.id,
      kind: s.kind,
      finishedAt: s.finishedAt!,
      assessmentId: s.assessmentId,
      totalQuestions,
      correctAnswers,
      allCorrect,
      pillarCode,
    };
  });

  // 3. Ambil semua asesmen WAJIB aktif milik angkatan siswa
  const activeWajibAssessments = await prisma.assessment.findMany({
    where: {
      gradeLevel,
      type: "WAJIB",
      isActive: true,
    },
    include: {
      sourceTopic: { include: { pillar: true } },
      questions: {
        take: 1,
        include: {
          question: {
            include: { topic: { include: { pillar: true } } },
          },
        },
      },
    },
  });

  // Kelompokkan per pilar
  const pillarMap = new Map<
    string,
    { totalActive: number; allOpened: boolean; assessmentIds: number[] }
  >();

  for (const a of activeWajibAssessments) {
    const pCode =
      a.sourceTopic?.pillar.code ??
      a.questions[0]?.question.topic.pillar.code;
    if (!pCode) continue;

    const existing = pillarMap.get(pCode) ?? {
      totalActive: 0,
      allOpened: true,
      assessmentIds: [],
    };
    existing.totalActive += 1;
    existing.assessmentIds.push(a.id);
    if (!a.opensAt || a.opensAt > now) {
      existing.allOpened = false;
    }
    pillarMap.set(pCode, existing);
  }

  const gradePillarsInfo: PillarAssessmentInfo[] = Array.from(
    pillarMap.entries(),
  ).map(([pillarCode, data]) => ({
    pillarCode,
    totalActive: data.totalActive,
    allOpened: data.allOpened,
    assessmentIds: data.assessmentIds,
  }));

  // 4. Ambil lencana yang sudah dimiliki
  const existingStudentBadges = await prisma.studentBadge.findMany({
    where: { studentId },
    include: { badge: true },
  });
  const alreadyEarnedBadgeCodes = existingStudentBadges.map((b) => b.badge.code);

  // 5. Evaluasi lencana baru
  const newlyEarnedCodes = evaluateBadges({
    completedSessions,
    gradePillarsInfo,
    alreadyEarnedBadgeCodes,
  });

  // 6. Simpan lencana baru
  for (const code of newlyEarnedCodes) {
    const badge = await prisma.badge.findUnique({ where: { code } });
    if (badge) {
      await prisma.studentBadge.create({
        data: {
          studentId,
          badgeId: badge.id,
          awardedAt: now,
        },
      });
    }
  }

  return newlyEarnedCodes;
}
