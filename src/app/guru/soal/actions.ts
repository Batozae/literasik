"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Difficulty } from "@prisma/client";
import { getAssessmentStatus } from "@/lib/schedule";
import { assertQuestionAccess, assertTopicAccess } from "@/lib/teacher-scope";
import { isQuestionLocked, validateQuestionInput } from "@/lib/question-rules";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type QuestionActionState = { errors: string[] };

function readQuestionInput(formData: FormData) {
  const rawCorrectOption = formData.get("correctOption");
  const correctOption = typeof rawCorrectOption === "string" && /^[0-3]$/.test(rawCorrectOption)
    ? Number(rawCorrectOption)
    : -1;
  return {
    topicId: Number(formData.get("topicId")),
    input: {
      text: formData.get("text"),
      explanation: formData.get("explanation"),
      difficulty: formData.get("difficulty"),
      options: [0, 1, 2, 3].map((index) => ({
        text: formData.get(`option-${index}`),
        isCorrect: correctOption === index,
      })),
    },
  };
}

function getQuestionStatuses(question: Awaited<ReturnType<typeof assertQuestionAccess>>, now: Date) {
  return question.assessmentQuestions.map(({ assessment }) => {
    if (!assessment.opensAt || !assessment.closesAt) return "Berlangsung" as const;
    return getAssessmentStatus(assessment.opensAt, assessment.closesAt, now);
  });
}

export async function createQuestionAction(
  _previousState: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const teacher = await requireTeacher();
  const { topicId, input } = readQuestionInput(formData);
  if (!Number.isInteger(topicId)) return { errors: ["Pilih materi yang valid."] };
  await assertTopicAccess(teacher.id, topicId);

  const errors = validateQuestionInput(input);
  if (errors.length > 0) return { errors };

  const options = input.options as Array<{ text: string; isCorrect: boolean }>;
  let question: { id: number };
  try {
    question = await prisma.question.create({
      data: {
        topicId,
        text: input.text as string,
        explanation: input.explanation as string,
        difficulty: input.difficulty as Difficulty,
        isActive: true,
        options: {
          create: options.map((option, index) => ({ ...option, order: index + 1 })),
        },
      },
      select: { id: true },
    });
  } catch {
    return { errors: ["Soal tidak dapat disimpan saat ini. Coba lagi."] };
  }
  revalidatePath("/guru/soal");
  redirect(`/guru/soal/${question.id}`);
}

export async function updateQuestionAction(
  questionId: number,
  _previousState: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const teacher = await requireTeacher();
  if (!Number.isInteger(questionId)) notFound();
  const question = await assertQuestionAccess(teacher.id, questionId);
  const now = new Date();
  if (isQuestionLocked(question.answers.length > 0, getQuestionStatuses(question, now))) {
    return { errors: ["Isi soal sudah terkunci dan tidak dapat diubah."] };
  }

  const { topicId, input } = readQuestionInput(formData);
  if (!Number.isInteger(topicId)) return { errors: ["Pilih materi yang valid."] };
  await assertTopicAccess(teacher.id, topicId);
  const errors = validateQuestionInput(input);
  if (errors.length > 0) return { errors };

  const options = input.options as Array<{ text: string; isCorrect: boolean }>;
  if (question.options.length !== options.length) {
    return { errors: ["Susunan opsi soal tidak valid. Muat ulang halaman dan coba lagi."] };
  }

  try {
    await prisma.$transaction([
      prisma.question.update({
        where: { id: questionId },
        data: {
          topicId,
          text: input.text as string,
          explanation: input.explanation as string,
          difficulty: input.difficulty as Difficulty,
        },
      }),
      ...question.options.map((option, index) => prisma.option.update({
        where: { id: option.id },
        data: { text: options[index].text, isCorrect: options[index].isCorrect },
      })),
    ]);
  } catch {
    return { errors: ["Perubahan soal tidak dapat disimpan saat ini. Coba lagi."] };
  }
  revalidatePath("/guru/soal");
  revalidatePath(`/guru/soal/${questionId}`);
  redirect(`/guru/soal/${questionId}`);
}

export async function setQuestionActiveAction(
  questionId: number,
  isActive: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const teacher = await requireTeacher();
  if (!Number.isInteger(questionId) || typeof isActive !== "boolean") notFound();
  const question = await assertQuestionAccess(teacher.id, questionId);
  const statuses = getQuestionStatuses(question, new Date());

  if (!isActive && statuses.some((status) => status === "Dijadwalkan" || status === "Berlangsung")) {
    const hasScheduled = statuses.includes("Dijadwalkan");
    return {
      ok: false,
      message: hasScheduled
        ? "Soal tidak dapat dinonaktifkan karena masih ada di asesmen yang dijadwalkan."
        : "Soal tidak dapat dinonaktifkan karena masih ada di asesmen yang berlangsung.",
    };
  }

  try {
    await prisma.question.update({ where: { id: questionId }, data: { isActive } });
    revalidatePath("/guru/soal");
    revalidatePath(`/guru/soal/${questionId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: "Status soal tidak dapat diperbarui. Coba lagi." };
  }
}
