import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function getTeacherGradeLevels(teacherId: number): Promise<number[]> {
  const assignments = await prisma.teacherClass.findMany({
    where: { teacherId },
    select: { class: { select: { gradeLevel: true } } },
  });
  return [...new Set(assignments.map((assignment) => assignment.class.gradeLevel))].sort();
}

export async function assertTopicAccess(teacherId: number, topicId: number) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { pillar: true },
  });
  if (!topic) notFound();

  const gradeLevels = await getTeacherGradeLevels(teacherId);
  if (!gradeLevels.includes(topic.gradeLevel)) notFound();
  return topic;
}

export async function assertQuestionAccess(teacherId: number, questionId: number) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      topic: { include: { pillar: true } },
      options: { orderBy: { order: "asc" } },
      answers: { select: { id: true } },
      assessmentQuestions: {
        where: { assessment: { is: { type: "WAJIB" } } },
        include: { assessment: { select: { type: true, opensAt: true, closesAt: true } } },
      },
    },
  });
  if (!question) notFound();

  const gradeLevels = await getTeacherGradeLevels(teacherId);
  if (!gradeLevels.includes(question.topic.gradeLevel)) notFound();
  return question;
}
