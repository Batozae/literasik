import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const getTeacherGradeLevels = cache(async (teacherId: number): Promise<number[]> => {
  const assignments = await prisma.teacherClass.findMany({
    where: { teacherId },
    select: { class: { select: { gradeLevel: true } } },
  });
  return [...new Set(assignments.map((assignment) => assignment.class.gradeLevel))].sort();
});

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

export const getTeacherClasses = cache(async (teacherId: number) => {
  const assignments = await prisma.teacherClass.findMany({
    where: { teacherId },
    include: { class: true },
    orderBy: { class: { name: "asc" } },
  });
  return assignments.map((a) => a.class);
});

export async function assertAssessmentAccess(
  teacherId: number,
  assessmentId: number,
) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      sourceTopic: { include: { pillar: true } },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              topic: { include: { pillar: true } },
            },
          },
        },
      },
      targetClasses: {
        include: { class: true },
        orderBy: { class: { name: "asc" } },
      },
      sessions: {
        select: {
          id: true,
          studentId: true,
          startedAt: true,
          finishedAt: true,
          student: {
            select: {
              name: true,
              student: { select: { class: { select: { name: true } } } },
            },
          },
          answers: { select: { id: true, isCorrect: true } },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });

  if (!assessment) notFound();

  const gradeLevels = await getTeacherGradeLevels(teacherId);
  if (!gradeLevels.includes(assessment.gradeLevel)) notFound();

  return assessment;
}
