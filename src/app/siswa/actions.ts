"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { isTopicUnlockedForPractice } from "@/lib/assessment-rules";
import { canStartSession, getWibDate } from "@/lib/schedule";
import {
  calculatePracticePointsForAnswer,
  POINTS_PRACTICE_DAILY_CAP,
  POINTS_WAJIB_CORRECT,
  POINTS_WAJIB_BONUS,
} from "@/lib/scoring";
import { evaluateAndAwardBadges } from "@/lib/badge-evaluator";

export interface PracticeAnswerFeedback {
  isCorrect: boolean;
  correctOptionId: number;
  explanation: string;
  pointsEarned: number;
  dailyCapReached: boolean;
}

/**
 * Memulai atau melanjutkan sesi asesmen WAJIB untuk siswa.
 */
export async function startWajibSessionAction(assessmentId: number) {
  const user = await requireStudent();
  const now = new Date();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });
  if (!profile) {
    throw new Error("Profil siswa tidak ditemukan.");
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!assessment || !assessment.isActive || assessment.type !== "WAJIB") {
    throw new Error("Asesmen tidak ditemukan atau tidak aktif.");
  }

  if (assessment.gradeLevel !== profile.class.gradeLevel) {
    throw new Error("Asesmen ini bukan untuk angkatan Anda.");
  }

  const wajibKey = `${user.id}-${assessment.id}`;
  const existingSession = await prisma.assessmentSession.findUnique({
    where: { wajibKey },
  });

  if (existingSession) {
    if (existingSession.finishedAt !== null) {
      redirect(`/siswa/hasil/${existingSession.id}`);
    }

    if (assessment.closesAt && now >= assessment.closesAt) {
      await finalizeExpiredSession(
        existingSession.id,
        user.id,
        assessment.closesAt,
      );
      redirect(`/siswa/hasil/${existingSession.id}`);
    }

    redirect(`/siswa/sesi/${existingSession.id}`);
  }

  if (!assessment.opensAt || !assessment.closesAt) {
    throw new Error("Jadwal asesmen belum dikonfigurasi.");
  }

  if (!canStartSession(assessment.opensAt, assessment.closesAt, now, false)) {
    throw new Error("Asesmen tidak dapat dimulai di luar jendela waktu.");
  }

  const topicId =
    assessment.sourceTopicId ??
    (assessment.questions.length > 0
      ? (
          await prisma.question.findUnique({
            where: { id: assessment.questions[0].questionId },
            select: { topicId: true },
          })
        )?.topicId
      : null);

  const session = await prisma.assessmentSession.create({
    data: {
      studentId: user.id,
      kind: "WAJIB",
      assessmentId: assessment.id,
      topicId,
      startedAt: now,
      wajibKey,
    },
  });

  revalidatePath("/siswa");
  revalidatePath("/siswa/asesmen");
  redirect(`/siswa/sesi/${session.id}`);
}

/**
 * SIS-07 / ASM-05: Memulai atau melanjutkan sesi LATIHAN Rekomendasi Guru.
 */
export async function startRecommendedPracticeAction(assessmentId: number) {
  const user = await requireStudent();
  const now = new Date();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });
  if (!profile) {
    throw new Error("Profil siswa tidak ditemukan.");
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: { select: { topicId: true } } },
      },
      targetClasses: { select: { classId: true } },
    },
  });

  if (!assessment || !assessment.isActive || assessment.type !== "LATIHAN") {
    throw new Error("Latihan rekomendasi tidak ditemukan atau tidak aktif.");
  }

  if (assessment.gradeLevel !== profile.class.gradeLevel) {
    throw new Error("Latihan ini bukan untuk angkatan Anda.");
  }

  if (
    assessment.targetClasses.length > 0 &&
    !assessment.targetClasses.some((tc) => tc.classId === profile.classId)
  ) {
    throw new Error("Latihan rekomendasi ini bukan untuk kelas Anda.");
  }

  if (assessment.questions.length === 0) {
    throw new Error("Latihan ini belum memiliki soal.");
  }

  // Penegakan D-04: Pastikan jendela WAJIB materi terkait sudah tertutup
  const topicIds = [
    ...new Set([
      ...(assessment.sourceTopicId ? [assessment.sourceTopicId] : []),
      ...assessment.questions.map((q) => q.question.topicId),
    ]),
  ];

  const wajibAssessments = await prisma.assessment.findMany({
    where: {
      gradeLevel: profile.class.gradeLevel,
      type: "WAJIB",
      isActive: true,
    },
    include: {
      questions: { select: { question: { select: { topicId: true } } } },
    },
  });

  for (const tId of topicIds) {
    const relatedWajib = wajibAssessments.filter(
      (a) =>
        a.sourceTopicId === tId ||
        a.questions.some((q) => q.question.topicId === tId),
    );
    if (!isTopicUnlockedForPractice(relatedWajib, now)) {
      throw new Error(
        "Soal materi ini belum terbuka untuk latihan karena jendela asesmen wajib belum tertutup (D-04).",
      );
    }
  }

  // Jika ada sesi latihan rekomendasi yang belum selesai, lanjutkan sesi tersebut
  const unfinished = await prisma.assessmentSession.findFirst({
    where: {
      studentId: user.id,
      kind: "LATIHAN",
      assessmentId: assessment.id,
      finishedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  if (unfinished) {
    redirect(`/siswa/sesi/${unfinished.id}`);
  }

  const topicId =
    assessment.sourceTopicId ??
    assessment.questions[0]?.question.topicId ??
    null;

  const session = await prisma.assessmentSession.create({
    data: {
      studentId: user.id,
      kind: "LATIHAN",
      assessmentId: assessment.id,
      topicId,
      startedAt: now,
    },
  });

  revalidatePath("/siswa/latihan");
  redirect(`/siswa/sesi/${session.id}`);
}

/**
 * SIS-07: Memulai atau melanjutkan sesi LATIHAN Mandiri per Materi.
 * D-04: Soal materi baru terbuka setelah jendela WAJIB materi itu tertutup untuk angkatan siswa.
 */
export async function startTopicPracticeAction(topicId: number) {
  const user = await requireStudent();
  const now = new Date();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });
  if (!profile) {
    throw new Error("Profil siswa tidak ditemukan.");
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      questions: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  if (!topic || topic.gradeLevel !== profile.class.gradeLevel) {
    throw new Error("Materi tidak ditemukan untuk angkatan Anda.");
  }

  if (topic.questions.length === 0) {
    throw new Error("Belum ada soal aktif pada materi ini.");
  }

  // Penegakan D-04: pastikan jendela WAJIB materi ini sudah tertutup
  const wajibAssessments = await prisma.assessment.findMany({
    where: {
      gradeLevel: profile.class.gradeLevel,
      type: "WAJIB",
      isActive: true,
    },
    include: {
      questions: { select: { question: { select: { topicId: true } } } },
    },
  });

  const relatedWajib = wajibAssessments.filter(
    (a) =>
      a.sourceTopicId === topic.id ||
      a.questions.some((q) => q.question.topicId === topic.id),
  );

  if (!isTopicUnlockedForPractice(relatedWajib, now)) {
    throw new Error(
      "Materi ini belum terbuka untuk latihan karena jendela asesmen wajib belum tertutup (D-04).",
    );
  }

  // Jika ada sesi latihan mandiri pada materi ini yang belum selesai, lanjutkan
  const unfinished = await prisma.assessmentSession.findFirst({
    where: {
      studentId: user.id,
      kind: "LATIHAN",
      assessmentId: null,
      topicId: topic.id,
      finishedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  if (unfinished) {
    redirect(`/siswa/sesi/${unfinished.id}`);
  }

  const session = await prisma.assessmentSession.create({
    data: {
      studentId: user.id,
      kind: "LATIHAN",
      assessmentId: null,
      topicId: topic.id,
      startedAt: now,
    },
  });

  revalidatePath("/siswa/latihan");
  redirect(`/siswa/sesi/${session.id}`);
}

/**
 * Menyimpan jawaban siswa untuk satu soal pada sesi yang sedang berjalan.
 * Sesuai D-11:
 * - WAJIB: Tidak pernah mengembalikan isCorrect, opsi benar, atau penjelasan.
 * - LATIHAN: Mengembalikan umpan balik langsung (isCorrect, correctOptionId, explanation, pointsEarned)
 *   HANYA setelah siswa mengirim jawaban untuk soal tersebut.
 */
export async function saveAnswerAction(
  sessionId: number,
  questionId: number,
  selectedOptionId: number,
): Promise<{
  success: boolean;
  message: string;
  expired?: boolean;
  feedback?: PracticeAnswerFeedback;
}> {
  const user = await requireStudent();
  const now = new Date();

  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: { assessment: true },
  });

  if (!session || session.studentId !== user.id) {
    throw new Error("Sesi tidak ditemukan atau akses ditolak.");
  }

  if (session.finishedAt !== null) {
    return {
      success: false,
      message: "Sesi sudah diselesaikan.",
      expired: true,
    };
  }

  // Untuk WAJIB: cek apakah waktu closesAt sudah lewat
  if (
    session.kind === "WAJIB" &&
    session.assessment?.closesAt &&
    now >= session.assessment.closesAt
  ) {
    await finalizeExpiredSession(
      session.id,
      user.id,
      session.assessment.closesAt,
    );
    return {
      success: false,
      message: "Waktu pengerjaan asesmen telah berakhir.",
      expired: true,
    };
  }

  // Validasi soal termasuk dalam sesi ini
  if (session.assessmentId) {
    const questionLink = await prisma.assessmentQuestion.findUnique({
      where: {
        assessmentId_questionId: {
          assessmentId: session.assessmentId,
          questionId,
        },
      },
    });
    if (!questionLink) {
      throw new Error("Soal tidak terdaftar dalam asesmen ini.");
    }
  } else if (session.topicId) {
    const qTopic = await prisma.question.findUnique({
      where: { id: questionId },
      select: { topicId: true, isActive: true },
    });
    if (!qTopic || qTopic.topicId !== session.topicId) {
      throw new Error("Soal tidak termasuk dalam materi latihan ini.");
    }
  }

  // Validasi opsi jawaban
  const option = await prisma.option.findUnique({
    where: { id: selectedOptionId },
  });
  if (!option || option.questionId !== questionId) {
    throw new Error("Opsi jawaban tidak valid.");
  }

  // Alur WAJIB: simpan/perbarui tanpa membocorkan kunci/penjelasan (D-11)
  if (session.kind === "WAJIB") {
    await prisma.answer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId,
        },
      },
      update: {
        selectedOptionId,
        isCorrect: option.isCorrect,
        answeredAt: now,
      },
      create: {
        sessionId,
        studentId: user.id,
        questionId,
        selectedOptionId,
        isCorrect: option.isCorrect,
        answeredAt: now,
      },
    });

    return { success: true, message: "Jawaban tersimpan." };
  }

  // Alur LATIHAN: umpan balik langsung + hitung poin latihan harian (D-04, D-05, D-11)
  const existingAnswer = await prisma.answer.findUnique({
    where: {
      sessionId_questionId: {
        sessionId,
        questionId,
      },
    },
  });

  const questionDetail = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      explanation: true,
      options: {
        select: { id: true, isCorrect: true },
      },
    },
  });

  const correctOptionId =
    questionDetail?.options.find((o) => o.isCorrect)?.id ?? selectedOptionId;
  const explanation = questionDetail?.explanation ?? "";

  if (existingAnswer) {
    return {
      success: true,
      message: existingAnswer.isCorrect
        ? "Jawaban benar!"
        : "Jawaban belum tepat.",
      feedback: {
        isCorrect: existingAnswer.isCorrect,
        correctOptionId,
        explanation,
        pointsEarned: 0,
        dailyCapReached: false,
      },
    };
  }

  // Hitung poin latihan yang sudah diperoleh hari ini (WIB)
  const todayWib = getWibDate(now);
  const practiceEvents = await prisma.pointEvent.findMany({
    where: {
      studentId: user.id,
      type: "LATIHAN_ANSWER",
    },
    select: { points: true, createdAt: true },
  });

  const todayPracticePoints = practiceEvents
    .filter((e) => getWibDate(e.createdAt) === todayWib)
    .reduce((sum, e) => sum + e.points, 0);

  const pointsEarned = calculatePracticePointsForAnswer(
    todayPracticePoints,
    option.isCorrect,
  );
  const dailyCapReached =
    option.isCorrect &&
    pointsEarned === 0 &&
    todayPracticePoints >= POINTS_PRACTICE_DAILY_CAP;

  await prisma.$transaction(async (tx) => {
    await tx.answer.create({
      data: {
        sessionId,
        studentId: user.id,
        questionId,
        selectedOptionId,
        isCorrect: option.isCorrect,
        answeredAt: now,
      },
    });

    if (pointsEarned > 0) {
      await tx.pointEvent.create({
        data: {
          studentId: user.id,
          sessionId,
          type: "LATIHAN_ANSWER",
          points: pointsEarned,
          createdAt: now,
        },
      });
    }
  });

  return {
    success: true,
    message: option.isCorrect ? "Jawaban benar!" : "Jawaban belum tepat.",
    feedback: {
      isCorrect: option.isCorrect,
      correctOptionId,
      explanation,
      pointsEarned,
      dailyCapReached,
    },
  };
}

/**
 * Menyelesaikan sesi asesmen WAJIB oleh siswa secara manual.
 */
export async function finishWajibSessionAction(sessionId: number) {
  const user = await requireStudent();
  const now = new Date();

  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      assessment: {
        include: {
          questions: true,
        },
      },
      answers: true,
    },
  });

  if (!session || session.studentId !== user.id) {
    throw new Error("Sesi tidak ditemukan atau akses ditolak.");
  }

  if (session.finishedAt !== null) {
    redirect(`/siswa/hasil/${sessionId}`);
  }

  const closesAt = session.assessment?.closesAt;
  const isAfterClose = closesAt ? now >= closesAt : false;
  const finishTimestamp = isAfterClose && closesAt ? closesAt : now;

  const totalQuestions = session.assessment?.questions.length ?? 0;
  const totalAnswers = session.answers.length;
  const allAnswered = totalQuestions > 0 && totalAnswers >= totalQuestions;
  const isEligibleForBonus = !isAfterClose && allAnswered;

  const correctCount = session.answers.filter((a) => a.isCorrect).length;

  await prisma.$transaction(async (tx) => {
    await tx.assessmentSession.update({
      where: { id: sessionId },
      data: { finishedAt: finishTimestamp },
    });

    for (let i = 0; i < correctCount; i++) {
      await tx.pointEvent.create({
        data: {
          studentId: user.id,
          sessionId,
          type: "WAJIB_ANSWER",
          points: POINTS_WAJIB_CORRECT,
          createdAt: finishTimestamp,
        },
      });
    }

    if (isEligibleForBonus) {
      await tx.pointEvent.create({
        data: {
          studentId: user.id,
          sessionId,
          type: "WAJIB_BONUS",
          points: POINTS_WAJIB_BONUS,
          createdAt: finishTimestamp,
        },
      });
    }
  });

  await evaluateAndAwardBadges(user.id, finishTimestamp);

  revalidatePath("/siswa");
  revalidatePath("/siswa/asesmen");
  revalidatePath("/siswa/riwayat");
  revalidatePath("/siswa/peringkat");
  redirect(`/siswa/hasil/${sessionId}`);
}

/**
 * SIS-07: Menyelesaikan sesi LATIHAN (mandiri maupun rekomendasi guru).
 */
export async function finishPracticeSessionAction(sessionId: number) {
  const user = await requireStudent();
  const now = new Date();

  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.studentId !== user.id || session.kind !== "LATIHAN") {
    throw new Error("Sesi latihan tidak ditemukan atau akses ditolak.");
  }

  if (session.finishedAt === null) {
    await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { finishedAt: now },
    });
    await evaluateAndAwardBadges(user.id, now);
  }

  revalidatePath("/siswa");
  revalidatePath("/siswa/latihan");
  revalidatePath("/siswa/riwayat");
  revalidatePath("/guru");
  redirect(`/siswa/hasil/${sessionId}`);
}

/**
 * Menutup otomatis sesi yang sudah lewat closesAt tanpa bonus (D-14).
 */
export async function finalizeExpiredSession(
  sessionId: number,
  studentId: number,
  closesAt: Date,
) {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: { answers: true },
  });

  if (!session || session.finishedAt !== null) return;

  const correctCount = session.answers.filter((a) => a.isCorrect).length;

  await prisma.$transaction(async (tx) => {
    await tx.assessmentSession.update({
      where: { id: sessionId },
      data: { finishedAt: closesAt },
    });

    for (let i = 0; i < correctCount; i++) {
      await tx.pointEvent.create({
        data: {
          studentId,
          sessionId,
          type: "WAJIB_ANSWER",
          points: POINTS_WAJIB_CORRECT,
          createdAt: closesAt,
        },
      });
    }
  });

  await evaluateAndAwardBadges(studentId, closesAt);
}
