"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { canStartSession } from "@/lib/schedule";
import {
  calculateWajibPoints,
  POINTS_WAJIB_CORRECT,
  POINTS_WAJIB_BONUS,
} from "@/lib/scoring";
import { evaluateAndAwardBadges } from "@/lib/badge-evaluator";

/**
 * Memulai atau melanjutkan sesi asesmen WAJIB untuk siswa.
 */
export async function startWajibSessionAction(assessmentId: number) {
  const user = await requireStudent();
  const now = new Date();

  // 1. Ambil profil siswa dan kelasnya
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });
  if (!profile) {
    throw new Error("Profil siswa tidak ditemukan.");
  }

  // 2. Ambil data asesmen
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

  // 3. Cek sesi yang sudah ada dengan kunci wajibKey
  const wajibKey = `${user.id}-${assessment.id}`;
  const existingSession = await prisma.assessmentSession.findUnique({
    where: { wajibKey },
  });

  if (existingSession) {
    if (existingSession.finishedAt !== null) {
      redirect(`/siswa/hasil/${existingSession.id}`);
    }

    // Jika waktu sudah lewat closesAt, tutup otomatis sesi
    if (assessment.closesAt && now >= assessment.closesAt) {
      await finalizeExpiredSession(existingSession.id, user.id, assessment.closesAt);
      redirect(`/siswa/hasil/${existingSession.id}`);
    }

    redirect(`/siswa/sesi/${existingSession.id}`);
  }

  // 4. Periksa apakah sesi boleh dimulai sekarang
  if (!assessment.opensAt || !assessment.closesAt) {
    throw new Error("Jadwal asesmen belum dikonfigurasi.");
  }

  if (!canStartSession(assessment.opensAt, assessment.closesAt, now, false)) {
    throw new Error("Asesmen tidak dapat dimulai di luar jendela waktu.");
  }

  // 5. Tentukan topicId untuk sesi
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

  // 6. Buat sesi baru
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
 * Menyimpan jawaban siswa untuk satu soal pada sesi yang sedang berjalan.
 * Sesuai D-11: Tidak pernah mengembalikan isCorrect atau penjelasan.
 */
export async function saveAnswerAction(
  sessionId: number,
  questionId: number,
  selectedOptionId: number,
): Promise<{ success: boolean; message: string; expired?: boolean }> {
  const user = await requireStudent();
  const now = new Date();

  // 1. Ambil sesi
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: { assessment: true },
  });

  if (!session || session.studentId !== user.id) {
    throw new Error("Sesi tidak ditemukan atau akses ditolak.");
  }

  if (session.finishedAt !== null) {
    return { success: false, message: "Sesi sudah diselesaikan.", expired: true };
  }

  // Cek apakah waktu closesAt sudah lewat
  if (session.assessment?.closesAt && now >= session.assessment.closesAt) {
    await finalizeExpiredSession(session.id, user.id, session.assessment.closesAt);
    return {
      success: false,
      message: "Waktu pengerjaan asesmen telah berakhir.",
      expired: true,
    };
  }

  // 2. Validasi soal ada di dalam asesmen
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
  }

  // 3. Validasi opsi jawaban
  const option = await prisma.option.findUnique({
    where: { id: selectedOptionId },
  });
  if (!option || option.questionId !== questionId) {
    throw new Error("Opsi jawaban tidak valid.");
  }

  // 4. Simpan atau perbarui jawaban
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

  // Cek kelayakan bonus: selesai sebelum closesAt dan semua soal dijawab
  const totalQuestions = session.assessment?.questions.length ?? 0;
  const totalAnswers = session.answers.length;
  const allAnswered = totalQuestions > 0 && totalAnswers >= totalQuestions;
  const isEligibleForBonus = !isAfterClose && allAnswered;

  const correctAnswers = session.answers.filter((a) => a.isCorrect);

  await prisma.$transaction(async (tx) => {
    // Tandai selesai
    await tx.assessmentSession.update({
      where: { id: sessionId },
      data: { finishedAt: finishTimestamp },
    });

    // Buat PointEvent untuk tiap jawaban benar
    for (const _answer of correctAnswers) {
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

    // Jika berhak bonus ketepatan waktu
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

  // Evaluasi dan sematkan lencana
  await evaluateAndAwardBadges(user.id, finishTimestamp);

  revalidatePath("/siswa");
  revalidatePath("/siswa/asesmen");
  revalidatePath("/siswa/riwayat");
  revalidatePath("/siswa/peringkat");
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

  const correctAnswers = session.answers.filter((a) => a.isCorrect);

  await prisma.$transaction(async (tx) => {
    await tx.assessmentSession.update({
      where: { id: sessionId },
      data: { finishedAt: closesAt },
    });

    for (const _answer of correctAnswers) {
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
