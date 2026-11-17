"use server";

import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherGradeLevels } from "@/lib/teacher-scope";

/**
 * GUR-10 / D-10: Buat asesmen LATIHAN dari materi tersulit/sedang.
 * - Judul: "Latihan: {nama materi}"
 * - sourceTopicId diisi
 * - Semua soal aktif dari topik tersebut
 * - Kelas tujuan: semua kelas guru (atau kelas yang difilter)
 * - isActive: false (guru bisa edit sebelum diaktifkan)
 */
export async function createPracticeFromTopicAction(formData: FormData) {
  const teacher = await requireTeacher();
  const topicId = Number(formData.get("topicId"));
  const classIdParam = formData.get("classId");

  if (!topicId || isNaN(topicId)) throw new Error("topicId tidak valid.");

  // Validasi akses guru ke topik ini
  const gradeLevels = await getTeacherGradeLevels(teacher.id);
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { pillar: true },
  });
  if (!topic || !gradeLevels.includes(topic.gradeLevel)) {
    throw new Error("Akses ditolak: topik tidak termasuk dalam angkatan kelas kamu.");
  }

  // Pastikan jendela WAJIB untuk topik ini sudah tertutup (D-04)
  const wajibAsm = await prisma.assessment.findFirst({
    where: {
      type: "WAJIB",
      sourceTopicId: topicId,
      gradeLevel: topic.gradeLevel,
      isActive: true,
    },
  });
  if (wajibAsm && wajibAsm.closesAt && new Date() < wajibAsm.closesAt) {
    throw new Error(
      "Soal materi ini belum bisa dipakai: jendela asesmen WAJIB belum tertutup.",
    );
  }

  // Ambil semua soal aktif dari topik ini
  const questions = await prisma.question.findMany({
    where: { topicId, isActive: true },
    select: { id: true },
  });
  if (!questions.length) {
    throw new Error("Tidak ada soal aktif pada materi ini.");
  }

  // Kelas tujuan
  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId: teacher.id },
    include: { class: { select: { id: true, gradeLevel: true } } },
  });
  const targetClasses = classIdParam
    ? teacherClasses.filter((tc) => tc.class.id === Number(classIdParam))
    : teacherClasses.filter((tc) => tc.class.gradeLevel === topic.gradeLevel);

  if (!targetClasses.length) {
    throw new Error("Tidak ada kelas tujuan yang valid.");
  }

  // Buat asesmen latihan
  const newAssessment = await prisma.assessment.create({
    data: {
      title: `Latihan: ${topic.name}`,
      description: `Latihan rekomendasi dari materi "${topic.name}". Dibuat otomatis dari dashboard analitik.`,
      type: "LATIHAN",
      gradeLevel: topic.gradeLevel,
      sourceTopicId: topicId,
      isActive: false, // guru harus aktifkan manual
      createdById: teacher.id,
      questions: {
        create: questions.map((q: { id: number }, i: number) => ({
          questionId: q.id,
          order: i + 1,
        })),
      },
      targetClasses: {
        create: targetClasses.map((tc: { class: { id: number } }) => ({ classId: tc.class.id })),
      },
    },
  });

  redirect(`/guru/asesmen/${newAssessment.id}`);
}
