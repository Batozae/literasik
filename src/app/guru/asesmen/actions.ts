"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { AssessmentType } from "@prisma/client";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCloseNow, canOpenNow } from "@/lib/schedule";
import {
  assertAssessmentAccess,
  getTeacherClasses,
  getTeacherGradeLevels,
} from "@/lib/teacher-scope";
import {
  isAssessmentCompositionLocked,
  isTopicUnlockedForPractice,
  parseWibDateTimeInput,
  validateAssessmentInput,
} from "@/lib/assessment-rules";
import { finalizeExpiredSession } from "@/app/siswa/actions";

export type AssessmentFormState = {
  errors: string[];
  saved?: boolean;
};

function parsePositiveIntList(values: FormDataEntryValue[]): number[] {
  const result: number[] = [];
  for (const val of values) {
    const n = Number(val);
    if (Number.isInteger(n) && n > 0 && !result.includes(n)) {
      result.push(n);
    }
  }
  return result;
}

async function getLockedPracticeTopicNames(
  gradeLevel: number,
  topicIds: number[],
  now: Date,
): Promise<string[]> {
  if (topicIds.length === 0) return [];
  const uniqueTopicIds = [...new Set(topicIds)];
  const topics = await prisma.topic.findMany({
    where: { id: { in: uniqueTopicIds }, gradeLevel },
    select: { id: true, name: true },
  });

  const wajibAssessments = await prisma.assessment.findMany({
    where: {
      gradeLevel,
      type: "WAJIB",
      isActive: true,
    },
    include: {
      questions: {
        select: { question: { select: { topicId: true } } },
      },
    },
  });

  const lockedNames: string[] = [];
  for (const topic of topics) {
    const relatedWajib = wajibAssessments.filter(
      (a) =>
        a.sourceTopicId === topic.id ||
        a.questions.some((q) => q.question.topicId === topic.id),
    );
    if (!isTopicUnlockedForPractice(relatedWajib, now)) {
      lockedNames.push(topic.name);
    }
  }
  return lockedNames;
}

export async function createAssessmentAction(
  _prevState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const teacher = await requireTeacher();
  const now = new Date();

  const gradeLevels = await getTeacherGradeLevels(teacher.id);
  const teacherClasses = await getTeacherClasses(teacher.id);
  if (gradeLevels.length === 0) {
    return { errors: ["Anda belum memiliki penugasan kelas."] };
  }
  const gradeLevel = gradeLevels[0];

  const rawType = formData.get("type");
  const type =
    rawType === "WAJIB" || rawType === "LATIHAN" ? rawType : undefined;
  const title = formData.get("title");
  const description = String(formData.get("description") ?? "").trim() || null;
  const rawSourceTopicId = Number(formData.get("sourceTopicId"));
  const sourceTopicId =
    Number.isInteger(rawSourceTopicId) && rawSourceTopicId > 0
      ? rawSourceTopicId
      : null;

  const opensAt = parseWibDateTimeInput(formData.get("opensAt"));
  const closesAt = parseWibDateTimeInput(formData.get("closesAt"));
  const questionIds = parsePositiveIntList(formData.getAll("questionIds"));
  const requestedClassIds = parsePositiveIntList(
    formData.getAll("targetClassIds"),
  );
  const isActive = formData.get("isActive") === "true";

  const validTeacherClassIds = new Set(teacherClasses.map((c) => c.id));
  const targetClassIds = requestedClassIds.filter((id) =>
    validTeacherClassIds.has(id),
  );

  // Validasi soal milik angkatan guru & aktif
  const selectedQuestions =
    questionIds.length > 0
      ? await prisma.question.findMany({
          where: {
            id: { in: questionIds },
            isActive: true,
            topic: { gradeLevel },
          },
          select: { id: true, topicId: true },
        })
      : [];

  if (selectedQuestions.length !== questionIds.length) {
    return {
      errors: [
        "Beberapa soal yang dipilih tidak valid atau sudah dinonaktifkan.",
      ],
    };
  }

  let usedInOtherWajibQuestionIds = new Set<number>();
  let lockedPracticeTopicNames: string[] = [];

  if (type === "WAJIB") {
    const existingWajibQuestions = await prisma.assessmentQuestion.findMany({
      where: {
        questionId: { in: questionIds },
        assessment: { type: "WAJIB" },
      },
      select: { questionId: true },
    });
    usedInOtherWajibQuestionIds = new Set(
      existingWajibQuestions.map((q) => q.questionId),
    );
  } else if (type === "LATIHAN") {
    const topicIds = selectedQuestions.map((q) => q.topicId);
    if (sourceTopicId) topicIds.push(sourceTopicId);
    lockedPracticeTopicNames = await getLockedPracticeTopicNames(
      gradeLevel,
      topicIds,
      now,
    );
  }

  const errors = validateAssessmentInput({
    title,
    type,
    questionIds,
    opensAt,
    closesAt,
    targetClassIds,
    usedInOtherWajibQuestionIds,
    lockedPracticeTopicNames,
  });

  if (errors.length > 0) {
    return { errors };
  }

  const effectiveSourceTopicId =
    sourceTopicId ?? selectedQuestions[0]?.topicId ?? null;

  let createdId: number;
  try {
    const created = await prisma.assessment.create({
      data: {
        title: String(title).trim(),
        description,
        type: type as AssessmentType,
        gradeLevel,
        sourceTopicId: effectiveSourceTopicId,
        opensAt: type === "WAJIB" ? opensAt : null,
        closesAt: type === "WAJIB" ? closesAt : null,
        isActive,
        createdById: teacher.id,
        questions: {
          create: questionIds.map((questionId, idx) => ({
            questionId,
            order: idx + 1,
          })),
        },
        ...(type === "LATIHAN"
          ? {
              targetClasses: {
                create: targetClassIds.map((classId) => ({ classId })),
              },
            }
          : {}),
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch {
    return {
      errors: ["Asesmen tidak dapat disimpan saat ini. Coba lagi."],
    };
  }

  revalidatePath("/guru");
  revalidatePath("/guru/asesmen");
  revalidatePath("/siswa");
  revalidatePath("/siswa/asesmen");
  revalidatePath("/siswa/latihan");
  redirect(`/guru/asesmen/${createdId}`);
}

export async function updateAssessmentAction(
  assessmentId: number,
  _prevState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const teacher = await requireTeacher();
  if (!Number.isInteger(assessmentId) || assessmentId < 1) notFound();

  const existing = await assertAssessmentAccess(teacher.id, assessmentId);
  const now = new Date();
  const teacherClasses = await getTeacherClasses(teacher.id);

  const compositionLocked = isAssessmentCompositionLocked({
    type: existing.type,
    opensAt: existing.opensAt,
    now,
    hasSessions: existing.sessions.length > 0,
  });

  // Untuk WAJIB yang sudah dibuka (D-14), tolak perubahan komposisi dan jadwal
  if (existing.type === "WAJIB" && compositionLocked) {
    return {
      errors: [
        "Komposisi soal dan jendela waktu asesmen wajib sudah terkunci karena asesmen telah dibuka atau memiliki sesi pengerjaan (D-14).",
      ],
    };
  }

  const title = formData.get("title");
  const description = String(formData.get("description") ?? "").trim() || null;
  const rawSourceTopicId = Number(formData.get("sourceTopicId"));
  const sourceTopicId =
    Number.isInteger(rawSourceTopicId) && rawSourceTopicId > 0
      ? rawSourceTopicId
      : existing.sourceTopicId;

  const opensAt =
    existing.type === "WAJIB"
      ? parseWibDateTimeInput(formData.get("opensAt"))
      : null;
  const closesAt =
    existing.type === "WAJIB"
      ? parseWibDateTimeInput(formData.get("closesAt"))
      : null;

  const questionIds = compositionLocked
    ? existing.questions.map((q) => q.questionId)
    : parsePositiveIntList(formData.getAll("questionIds"));

  const requestedClassIds = parsePositiveIntList(
    formData.getAll("targetClassIds"),
  );
  const validTeacherClassIds = new Set(teacherClasses.map((c) => c.id));
  const targetClassIds = requestedClassIds.filter((id) =>
    validTeacherClassIds.has(id),
  );

  const selectedQuestions =
    questionIds.length > 0
      ? await prisma.question.findMany({
          where: {
            id: { in: questionIds },
            topic: { gradeLevel: existing.gradeLevel },
            ...(compositionLocked ? {} : { isActive: true }),
          },
          select: { id: true, topicId: true },
        })
      : [];

  if (selectedQuestions.length !== questionIds.length) {
    return {
      errors: [
        "Beberapa soal yang dipilih tidak valid atau sudah dinonaktifkan.",
      ],
    };
  }

  let usedInOtherWajibQuestionIds = new Set<number>();
  let lockedPracticeTopicNames: string[] = [];

  if (existing.type === "WAJIB") {
    const existingWajibQuestions = await prisma.assessmentQuestion.findMany({
      where: {
        assessmentId: { not: assessmentId },
        questionId: { in: questionIds },
        assessment: { type: "WAJIB" },
      },
      select: { questionId: true },
    });
    usedInOtherWajibQuestionIds = new Set(
      existingWajibQuestions.map((q) => q.questionId),
    );
  } else if (existing.type === "LATIHAN") {
    const topicIds = selectedQuestions.map((q) => q.topicId);
    if (sourceTopicId) topicIds.push(sourceTopicId);
    lockedPracticeTopicNames = await getLockedPracticeTopicNames(
      existing.gradeLevel,
      topicIds,
      now,
    );
  }

  const errors = validateAssessmentInput({
    title,
    type: existing.type,
    questionIds,
    opensAt,
    closesAt,
    targetClassIds,
    usedInOtherWajibQuestionIds,
    lockedPracticeTopicNames,
  });

  if (errors.length > 0) {
    return { errors };
  }

  const effectiveSourceTopicId =
    sourceTopicId ?? selectedQuestions[0]?.topicId ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          title: String(title).trim(),
          description,
          sourceTopicId: effectiveSourceTopicId,
          ...(existing.type === "WAJIB" ? { opensAt, closesAt } : {}),
        },
      });

      if (!compositionLocked) {
        await tx.assessmentQuestion.deleteMany({
          where: { assessmentId },
        });
        await tx.assessmentQuestion.createMany({
          data: questionIds.map((questionId, idx) => ({
            assessmentId,
            questionId,
            order: idx + 1,
          })),
        });
      }

      if (existing.type === "LATIHAN") {
        await tx.assessmentClass.deleteMany({
          where: { assessmentId },
        });
        await tx.assessmentClass.createMany({
          data: targetClassIds.map((classId) => ({
            assessmentId,
            classId,
          })),
        });
      }
    });
  } catch {
    return {
      errors: ["Perubahan asesmen tidak dapat disimpan saat ini. Coba lagi."],
    };
  }

  revalidatePath("/guru");
  revalidatePath("/guru/asesmen");
  revalidatePath(`/guru/asesmen/${assessmentId}`);
  revalidatePath("/siswa");
  revalidatePath("/siswa/asesmen");
  revalidatePath("/siswa/latihan");
  return { errors: [], saved: true };
}

export async function setAssessmentActiveAction(
  assessmentId: number,
  isActive: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const teacher = await requireTeacher();
  if (!Number.isInteger(assessmentId) || typeof isActive !== "boolean") {
    notFound();
  }

  const assessment = await assertAssessmentAccess(teacher.id, assessmentId);
  const now = new Date();

  if (isActive) {
    if (assessment.questions.length === 0) {
      return {
        ok: false,
        message: "Asesmen harus memiliki minimal 1 soal sebelum diaktifkan.",
      };
    }

    if (assessment.type === "WAJIB") {
      if (
        !assessment.opensAt ||
        !assessment.closesAt ||
        assessment.closesAt <= assessment.opensAt
      ) {
        return {
          ok: false,
          message:
            "Atur jadwal buka dan tutup yang valid sebelum mengaktifkan asesmen wajib.",
        };
      }
    } else if (assessment.type === "LATIHAN") {
      if (assessment.targetClasses.length === 0) {
        return {
          ok: false,
          message:
            "Pilih minimal 1 kelas sasaran sebelum mengaktifkan latihan rekomendasi.",
        };
      }
      const topicIds = assessment.questions.map((q) => q.question.topicId);
      if (assessment.sourceTopicId) topicIds.push(assessment.sourceTopicId);
      const lockedNames = await getLockedPracticeTopicNames(
        assessment.gradeLevel,
        topicIds,
        now,
      );
      if (lockedNames.length > 0) {
        return {
          ok: false,
          message: `Latihan belum bisa diaktifkan karena jendela asesmen wajib materi "${lockedNames.join(", ")}" belum tertutup (D-04).`,
        };
      }
    }
  }

  try {
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { isActive },
    });
    revalidatePath("/guru");
    revalidatePath("/guru/asesmen");
    revalidatePath(`/guru/asesmen/${assessmentId}`);
    revalidatePath("/siswa");
    revalidatePath("/siswa/asesmen");
    revalidatePath("/siswa/latihan");
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Status asesmen tidak dapat diperbarui saat ini.",
    };
  }
}

/**
 * ASM-06 / D-14: "Buka sekarang" hanya untuk asesmen WAJIB berstatus Dijadwalkan.
 */
export async function openAssessmentNowAction(
  assessmentId: number,
): Promise<{ ok: boolean; message?: string }> {
  const teacher = await requireTeacher();
  if (!Number.isInteger(assessmentId) || assessmentId < 1) notFound();

  const assessment = await assertAssessmentAccess(teacher.id, assessmentId);
  const now = new Date();

  if (assessment.type !== "WAJIB") {
    return {
      ok: false,
      message: "Aksi Buka Sekarang hanya berlaku untuk asesmen wajib.",
    };
  }

  if (assessment.questions.length === 0) {
    return {
      ok: false,
      message: "Asesmen harus memiliki minimal 1 soal sebelum dibuka.",
    };
  }

  if (
    !assessment.opensAt ||
    !assessment.closesAt ||
    !canOpenNow(assessment.opensAt, assessment.closesAt, now)
  ) {
    return {
      ok: false,
      message:
        'Aksi "Buka sekarang" hanya dapat dijalankan pada asesmen berstatus Dijadwalkan (D-14).',
    };
  }

  const originalDurationMs = Math.max(
    2 * 60 * 60 * 1000,
    assessment.closesAt.getTime() - assessment.opensAt.getTime(),
  );
  const nextClosesAt =
    assessment.closesAt.getTime() > now.getTime() + 15 * 60 * 1000
      ? assessment.closesAt
      : new Date(now.getTime() + originalDurationMs);

  try {
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        opensAt: now,
        closesAt: nextClosesAt,
        isActive: true,
      },
    });
    revalidatePath("/guru");
    revalidatePath("/guru/asesmen");
    revalidatePath(`/guru/asesmen/${assessmentId}`);
    revalidatePath("/siswa");
    revalidatePath("/siswa/asesmen");
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Asesmen tidak dapat dibuka saat ini. Coba lagi.",
    };
  }
}

/**
 * ASM-06 / D-14: "Tutup sekarang" hanya untuk asesmen WAJIB berstatus Berlangsung.
 * Sesi yang belum selesai ditutup otomatis (jawaban terkirim dihitung, tanpa bonus).
 */
export async function closeAssessmentNowAction(
  assessmentId: number,
): Promise<{ ok: boolean; message?: string }> {
  const teacher = await requireTeacher();
  if (!Number.isInteger(assessmentId) || assessmentId < 1) notFound();

  const assessment = await assertAssessmentAccess(teacher.id, assessmentId);
  const now = new Date();

  if (assessment.type !== "WAJIB") {
    return {
      ok: false,
      message: "Aksi Tutup Sekarang hanya berlaku untuk asesmen wajib.",
    };
  }

  if (
    !assessment.opensAt ||
    !assessment.closesAt ||
    !canCloseNow(assessment.opensAt, assessment.closesAt, now)
  ) {
    return {
      ok: false,
      message:
        'Aksi "Tutup sekarang" hanya dapat dijalankan pada asesmen berstatus Berlangsung (D-14).',
    };
  }

  try {
    // 1. Finalisasi semua sesi WAJIB yang belum selesai pada asesmen ini (D-14)
    const unfinishedSessions = await prisma.assessmentSession.findMany({
      where: {
        assessmentId,
        kind: "WAJIB",
        finishedAt: null,
      },
      select: { id: true, studentId: true },
    });

    for (const s of unfinishedSessions) {
      await finalizeExpiredSession(s.id, s.studentId, now);
    }

    // 2. Perbarui closesAt menjadi jam server sekarang
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { closesAt: now },
    });

    revalidatePath("/guru");
    revalidatePath("/guru/asesmen");
    revalidatePath(`/guru/asesmen/${assessmentId}`);
    revalidatePath("/guru/peringkat");
    revalidatePath("/siswa");
    revalidatePath("/siswa/asesmen");
    revalidatePath("/siswa/latihan");
    revalidatePath("/siswa/peringkat");
    revalidatePath("/siswa/riwayat");
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Asesmen tidak dapat ditutup saat ini. Coba lagi.",
    };
  }
}

