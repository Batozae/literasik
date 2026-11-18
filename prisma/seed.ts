import {
  PrismaClient,
  Role,
  AssessmentType,
  Difficulty,
  SessionKind,
  PointEventType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import questions from "./data/questions.json";
import { EXPECTED_TOPICS, validateQuestions } from "./data/validateQuestions";
import {
  calculateWajibPoints,
  calculatePracticePointsForAnswer,
} from "../src/lib/scoring";
import {
  POINTS_WAJIB_CORRECT,
  POINTS_WAJIB_BONUS,
} from "../src/lib/config";
import { evaluateAndAwardBadges } from "../src/lib/badge-evaluator";

const prisma = new PrismaClient();

const PILLARS = [
  { code: "KECAKAPAN", name: "Kecakapan" },
  { code: "ETIKA", name: "Etika" },
  { code: "KEAMANAN", name: "Keamanan" },
  { code: "BUDAYA", name: "Budaya" },
] as const;

const BADGES = [
  { code: "LANGKAH_PERTAMA", name: "Langkah Pertama", description: "Menyelesaikan satu sesi asesmen WAJIB." },
  { code: "TELITI", name: "Teliti", description: "Menjawab semua soal dengan benar dalam satu asesmen WAJIB." },
  { code: "KONSISTEN", name: "Konsisten", description: "Menyelesaikan sesi pada tiga tanggal berbeda." },
  { code: "PENJELAJAH", name: "Penjelajah", description: "Menyelesaikan asesmen WAJIB dari keempat pilar." },
  { code: "RAJIN_BERLATIH", name: "Rajin Berlatih", description: "Menyelesaikan tiga sesi LATIHAN." },
  { code: "TUNTAS_KECAKAPAN", name: "Tuntas Pilar Kecakapan", description: "Menyelesaikan semua asesmen WAJIB aktif pilar Kecakapan yang sudah dibuka." },
  { code: "TUNTAS_ETIKA", name: "Tuntas Pilar Etika", description: "Menyelesaikan semua asesmen WAJIB aktif pilar Etika yang sudah dibuka." },
  { code: "TUNTAS_KEAMANAN", name: "Tuntas Pilar Keamanan", description: "Menyelesaikan semua asesmen WAJIB aktif pilar Keamanan yang sudah dibuka." },
  { code: "TUNTAS_BUDAYA", name: "Tuntas Pilar Budaya", description: "Menyelesaikan semua asesmen WAJIB aktif pilar Budaya yang sudah dibuka." },
] as const;

const FIRST_NAMES = [
  "Aditya", "Aisyah", "Aldi", "Anisa", "Arif", "Ayu", "Bagas", "Bima",
  "Citra", "Dewi", "Dimas", "Dinda", "Fajar", "Farah", "Fitri", "Gilang",
  "Hana", "Hasan", "Intan", "Nadia", "Raka", "Siti",
];
const LAST_NAMES = [
  "Pratama", "Putri", "Saputra", "Lestari", "Wijaya", "Permata", "Hidayat",
  "Nugraha", "Kusuma", "Ramadhan", "Maulana", "Puspita", "Santoso", "Wibowo",
];

const CLASS_ROSTERS = [
  { name: "7A", gradeLevel: 7, count: 32, teacher: "guru1" },
  { name: "7B", gradeLevel: 7, count: 30, teacher: "guru1" },
  { name: "8A", gradeLevel: 8, count: 30, teacher: "guru2" },
  { name: "8B", gradeLevel: 8, count: 30, teacher: "guru2" },
] as const;

function makeRandom(seedText: string): () => number {
  let seed = 0;
  for (const character of seedText) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function datePartsInWib(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function assessmentWindow(seedDate: Date, dayOffset: number): { opensAt: Date; closesAt: Date } {
  const { year, month, day } = datePartsInWib(seedDate);
  const dayInUtc = new Date(Date.UTC(year, month - 1, day + dayOffset));
  const weekday = dayInUtc.getUTCDay();
  if (weekday === 0) dayInUtc.setUTCDate(dayInUtc.getUTCDate() - 2);
  if (weekday === 6) dayInUtc.setUTCDate(dayInUtc.getUTCDate() - 1);
  const opensAt = new Date(Date.UTC(dayInUtc.getUTCFullYear(), dayInUtc.getUTCMonth(), dayInUtc.getUTCDate(), 2));
  return { opensAt, closesAt: new Date(opensAt.getTime() + 4 * 60 * 60 * 1000) };
}

interface SeedStudent {
  userId: number;
  name: string;
  username: string;
  className: string;
  gradeLevel: number;
}

interface SeedAssessment {
  id: number;
  title: string;
  gradeLevel: number;
  opensAt: Date;
  closesAt: Date;
  topicName: string;
  pillarCode: string;
  isPast: boolean;
  questions: Array<{
    id: number;
    options: Array<{ id: number; isCorrect: boolean }>;
  }>;
}

async function main(): Promise<void> {
  const validationErrors = validateQuestions(questions);
  if (validationErrors.length > 0) {
    throw new Error(`Data questions.json tidak valid:\n- ${validationErrors.join("\n- ")}`);
  }

  const content = questions as Array<{
    topic: string;
    items: Array<{
      text: string;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      explanation: string;
      options: Array<{ text: string; isCorrect: boolean }>;
    }>;
  }>;
  const questionByTopic = new Map(content.map((entry) => [entry.topic, entry.items]));

  const [studentPasswordHash, teacherPasswordHash] = await Promise.all([
    bcrypt.hash("siswa123", 10),
    bcrypt.hash("guru123", 10),
  ]);

  // 1. Buat Pilar
  const pillarRecords = new Map<string, { id: number; name: string }>();
  for (const pillar of PILLARS) {
    const record = await prisma.pillar.create({ data: pillar });
    pillarRecords.set(pillar.code, record);
  }

  // 2. Buat Topik
  const topics = new Map<string, { id: number; gradeLevel: number; pillarCode: string }>();
  for (const item of EXPECTED_TOPICS) {
    const pillarName =
      item.name === "Pencarian dan penilaian informasi" ||
        item.name === "Komunikasi dan kolaborasi daring" ||
        item.name === "Pengelolaan berkas dan penyimpanan daring"
        ? "KECAKAPAN"
        : item.name === "Etika bermedia sosial" ||
          item.name === "Perundungan siber" ||
          item.name === "Hak cipta dan plagiarisme"
          ? "ETIKA"
          : item.name === "Kata sandi dan autentikasi" ||
            item.name === "Phishing dan penipuan online" ||
            item.name === "Privasi dan data pribadi"
            ? "KEAMANAN"
            : "BUDAYA";
    const pillar = pillarRecords.get(pillarName)!;
    const topic = await prisma.topic.create({
      data: { name: item.name, gradeLevel: item.gradeLevel, pillarId: pillar.id },
    });
    topics.set(item.name, { id: topic.id, gradeLevel: item.gradeLevel, pillarCode: pillarName });
  }

  // 3. Buat Lencana
  for (const badge of BADGES) await prisma.badge.create({ data: badge });

  // 4. Buat Guru
  const teacher1 = await prisma.user.create({
    data: { name: "Guru 1", username: "guru1", passwordHash: teacherPasswordHash, role: Role.TEACHER },
  });
  const teacher2 = await prisma.user.create({
    data: { name: "Guru 2", username: "guru2", passwordHash: teacherPasswordHash, role: Role.TEACHER },
  });
  const teachers = new Map([["guru1", teacher1], ["guru2", teacher2]]);

  // 5. Buat Kelas dan Siswa
  const rosterClasses = new Map<string, { id: number; gradeLevel: number }>();
  const createdStudents: SeedStudent[] = [];
  let studentOrdinal = 0;

  for (const roster of CLASS_ROSTERS) {
    const classRecord = await prisma.class.create({
      data: { name: roster.name, gradeLevel: roster.gradeLevel },
    });
    rosterClasses.set(roster.name, classRecord);
    const teacher = teachers.get(roster.teacher)!;
    await prisma.teacherClass.create({ data: { teacherId: teacher.id, classId: classRecord.id } });

    for (let classIndex = 1; classIndex <= roster.count; classIndex += 1) {
      const firstName = FIRST_NAMES[studentOrdinal % FIRST_NAMES.length];
      const lastName = LAST_NAMES[Math.floor(studentOrdinal / FIRST_NAMES.length)];
      studentOrdinal += 1;
      const username = `${roster.name.toLowerCase()}${String(classIndex).padStart(2, "0")}`;
      const fullName = `${firstName} ${lastName}`;

      const user = await prisma.user.create({
        data: {
          name: fullName,
          username,
          passwordHash: studentPasswordHash,
          role: Role.STUDENT,
        },
      });
      await prisma.studentProfile.create({ data: { userId: user.id, classId: classRecord.id } });

      createdStudents.push({
        userId: user.id,
        name: fullName,
        username,
        className: roster.name,
        gradeLevel: roster.gradeLevel,
      });
    }
  }

  // 6. Buat 12 Asesmen WAJIB (6 per angkatan)
  const seedDate = new Date();
  const dayOffsets = [-18, -14, -11, -7, -4, 3];
  const createdAssessments: SeedAssessment[] = [];

  for (const gradeLevel of [7, 8]) {
    const teacher = teachers.get(gradeLevel === 7 ? "guru1" : "guru2")!;
    const gradeTopics = EXPECTED_TOPICS.filter((topic) => topic.gradeLevel === gradeLevel);

    for (const [topicIndex, expectedTopic] of gradeTopics.entries()) {
      const topic = topics.get(expectedTopic.name)!;
      const topicQuestions = questionByTopic.get(expectedTopic.name)!;
      const random = makeRandom(`literasik-options-${expectedTopic.name}`);
      const { opensAt, closesAt } = assessmentWindow(seedDate, dayOffsets[topicIndex]);
      const isPast = dayOffsets[topicIndex] < 0;

      const assessmentQuestions = [];
      const questionRecords: Array<{
        id: number;
        options: Array<{ id: number; isCorrect: boolean }>;
      }> = [];

      for (const [order, item] of topicQuestions.entries()) {
        const shuffledOptions = shuffled(item.options, random);
        const createdQ = await prisma.question.create({
          data: {
            text: item.text,
            difficulty: item.difficulty as Difficulty,
            explanation: item.explanation,
            isActive: true,
            topicId: topic.id,
            options: {
              create: shuffledOptions.map((option, optionIndex) => ({
                text: option.text,
                isCorrect: option.isCorrect,
                order: optionIndex + 1,
              })),
            },
          },
          include: {
            options: true,
          },
        });

        questionRecords.push({
          id: createdQ.id,
          options: createdQ.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect })),
        });

        assessmentQuestions.push({
          order: order + 1,
          questionId: createdQ.id,
        });
      }

      const assessmentRecord = await prisma.assessment.create({
        data: {
          title: expectedTopic.name,
          type: AssessmentType.WAJIB,
          gradeLevel,
          opensAt,
          closesAt,
          sourceTopicId: topic.id,
          isActive: true,
          createdById: teacher.id,
          questions: { create: assessmentQuestions },
        },
      });

      createdAssessments.push({
        id: assessmentRecord.id,
        title: expectedTopic.name,
        gradeLevel,
        opensAt,
        closesAt,
        topicName: expectedTopic.name,
        pillarCode: topic.pillarCode,
        isPast,
        questions: questionRecords,
      });
    }
  }

  // 7. DAT-02: SEED DATA HISTORIS (Acak Ber-seed Tetap)
  // Aturan Master Context Bagian 8:
  // - Keamanan tersulit (~45-55%), Etika termudah (~80%), Kecakapan ~65-70%, Hoaks ~58%
  // - Kelas 7B sedikit di bawah 7A
  // - Sebaran: ~10% Perlu Pendampingan (12 siswa), ~15% Pantau (18 siswa), 3 Belum Cukup Data, sisanya Aman
  // - 3 siswa absen di beberapa asesmen
  // - 2 siswa banyak sesi latihan
  // - Beberapa latihan per materi dan 1-2 latihan rekomendasi

  // Klasifikasi Siswa
  const bcdUsernames = new Set(["7a32", "7b30", "8b30"]); // 3 siswa Belum Cukup Data
  const absentUsernames = new Map<string, number[]>([
    ["7a31", [3, 4]], // absen di asesmen index 3 & 4
    ["7b29", [1, 2, 4]], // absen di asesmen index 1, 2, 4
    ["8a30", [2, 4]], // absen di asesmen index 2 & 4
  ]);

  // Siswa Perlu Pendampingan (12 siswa):
  // 6 di kelas 7 (7A: 3, 7B: 3), 6 di kelas 8 (8A: 3, 8B: 3)
  const perluPendampinganUsernames = new Set([
    "7a28", "7a29", "7a30",
    "7b26", "7b27", "7b28",
    "8a26", "8a27", "8a28",
    "8b27", "8b28", "8b29",
  ]);

  // Siswa Pantau (18 siswa):
  // 9 di kelas 7 (7A: 5, 7B: 4), 9 di kelas 8 (8A: 5, 8B: 4)
  const pantauUsernames = new Set([
    "7a20", "7a21", "7a22", "7a23", "7a24",
    "7b21", "7b22", "7b23", "7b24",
    "8a20", "8a21", "8a22", "8a23", "8a24",
    "8b22", "8b23", "8b24", "8b25",
  ]);

  const pastAssessments = createdAssessments.filter((a) => a.isPast);

  // Buat sesi WAJIB historis
  for (const student of createdStudents) {
    const gradePastAssessments = pastAssessments.filter(
      (a) => a.gradeLevel === student.gradeLevel,
    );

    // Kasus 1: Siswa Belum Cukup Data
    // Hanya ikut 1 asesmen dan hanya menjawab 2 soal (< 10 total jawaban, tidak ada materi >= 3)
    if (bcdUsernames.has(student.username)) {
      const assessment = gradePastAssessments[0];
      if (assessment) {
        const startedAt = new Date(assessment.opensAt.getTime() + 10 * 60 * 1000);
        const finishedAt = new Date(startedAt.getTime() + 15 * 60 * 1000);

        const session = await prisma.assessmentSession.create({
          data: {
            studentId: student.userId,
            kind: SessionKind.WAJIB,
            assessmentId: assessment.id,
            topicId: topics.get(assessment.topicName)?.id,
            startedAt,
            finishedAt,
            wajibKey: `${student.userId}-${assessment.id}`,
          },
        });

        // Jawab 2 soal saja secara benar
        for (let qIdx = 0; qIdx < 2; qIdx++) {
          const q = assessment.questions[qIdx];
          const correctOpt = q.options.find((o) => o.isCorrect)!;
          await prisma.answer.create({
            data: {
              sessionId: session.id,
              studentId: student.userId,
              questionId: q.id,
              selectedOptionId: correctOpt.id,
              isCorrect: true,
              answeredAt: new Date(startedAt.getTime() + (qIdx + 1) * 60 * 1000),
            },
          });

          await prisma.pointEvent.create({
            data: {
              studentId: student.userId,
              sessionId: session.id,
              type: PointEventType.WAJIB_ANSWER,
              points: POINTS_WAJIB_CORRECT,
              createdAt: finishedAt,
            },
          });
        }
      }
      continue;
    }

    // Kasus 2: Siswa Reguler (Aman, Pantau, Perlu Pendampingan, atau sesekali Absen)
    const absentIndexes = absentUsernames.get(student.username) ?? [];
    const isPerluPendampingan = perluPendampinganUsernames.has(student.username);
    const isPantau = pantauUsernames.has(student.username);
    const is7B = student.className === "7B";

    for (let assIdx = 0; assIdx < gradePastAssessments.length; assIdx++) {
      if (absentIndexes.includes(assIdx)) {
        // Siswa absen pada asesmen ini (D-01: tanpa data, tidak ada sesi)
        continue;
      }

      const assessment = gradePastAssessments[assIdx];
      const startedAt = new Date(assessment.opensAt.getTime() + (10 + (student.userId % 20)) * 60 * 1000);
      const finishedAt = new Date(startedAt.getTime() + 15 * 60 * 1000);

      const session = await prisma.assessmentSession.create({
        data: {
          studentId: student.userId,
          kind: SessionKind.WAJIB,
          assessmentId: assessment.id,
          topicId: topics.get(assessment.topicName)?.id,
          startedAt,
          finishedAt,
          wajibKey: `${student.userId}-${assessment.id}`,
        },
      });

      // Tentukan target benar per topik (5 soal)
      let targetCorrect = 4;
      const isKeamanan = assessment.pillarCode === "KEAMANAN";
      const isEtika = assessment.pillarCode === "ETIKA";
      const isHoaks = assessment.topicName.includes("Hoaks");

      if (isPerluPendampingan) {
        // Siswa perlu pendampingan: lemah di >= 2 materi (Keamanan, Hoaks, Kecakapan dsb)
        if (isKeamanan || isHoaks || assIdx === 1) {
          targetCorrect = (student.userId + assIdx) % 2 === 0 ? 1 : 2; // akurasi 20% - 40% (< 60%)
        } else {
          targetCorrect = 2;
        }
      } else if (isPantau) {
        // Siswa pantau: tepat 1 materi lemah (< 60%, misal materi Keamanan pertama)
        if (assIdx === (student.gradeLevel === 7 ? 3 : 3)) {
          targetCorrect = 2; // 40% (< 60%) -> materi lemah
        } else if (isEtika) {
          targetCorrect = 4; // 80%
        } else {
          targetCorrect = 3; // 60%
        }
      } else {
        // Siswa Aman: tidak ada materi lemah (semua >= 3/5 = 60%)
        if (isEtika) {
          targetCorrect = (student.userId % 3 === 0) ? 5 : 4; // ~85%
        } else if (isKeamanan) {
          targetCorrect = is7B ? 3 : (student.userId % 2 === 0 ? 3 : 4); // ~65%
        } else if (isHoaks) {
          targetCorrect = 3; // 60%
        } else {
          // Kecakapan
          targetCorrect = is7B ? 3 : (student.userId % 3 === 0 ? 4 : 3); // ~65-70%
        }
      }

      // Pastikan targetCorrect di antara 0 dan 5
      targetCorrect = Math.max(0, Math.min(5, targetCorrect));

      // Buat 5 jawaban
      const prng = makeRandom(`seed-answer-${student.userId}-${assessment.id}`);
      const correctIndices = new Set(
        shuffled([0, 1, 2, 3, 4], prng).slice(0, targetCorrect),
      );

      let sessionCorrectCount = 0;

      for (let qIdx = 0; qIdx < assessment.questions.length; qIdx++) {
        const q = assessment.questions[qIdx];
        const shouldBeCorrect = correctIndices.has(qIdx);

        let selectedOptionId: number;
        if (shouldBeCorrect) {
          selectedOptionId = q.options.find((o) => o.isCorrect)!.id;
          sessionCorrectCount++;
        } else {
          const wrongOptions = q.options.filter((o) => !o.isCorrect);
          selectedOptionId = wrongOptions[Math.floor(prng() * wrongOptions.length)].id;
        }

        await prisma.answer.create({
          data: {
            sessionId: session.id,
            studentId: student.userId,
            questionId: q.id,
            selectedOptionId,
            isCorrect: shouldBeCorrect,
            answeredAt: new Date(startedAt.getTime() + (qIdx + 1) * 2 * 60 * 1000),
          },
        });
      }

      // Hitung dan buat PointEvent
      // Selesai sebelum closesAt dan semua soal dijawab -> berhak bonus 20 poin
      const { bonusPoints } = calculateWajibPoints(sessionCorrectCount, true);

      for (let i = 0; i < sessionCorrectCount; i++) {
        await prisma.pointEvent.create({
          data: {
            studentId: student.userId,
            sessionId: session.id,
            type: PointEventType.WAJIB_ANSWER,
            points: POINTS_WAJIB_CORRECT,
            createdAt: finishedAt,
          },
        });
      }

      if (bonusPoints > 0) {
        await prisma.pointEvent.create({
          data: {
            studentId: student.userId,
            sessionId: session.id,
            type: PointEventType.WAJIB_BONUS,
            points: POINTS_WAJIB_BONUS,
            createdAt: finishedAt,
          },
        });
      }
    }
  }

  // 8. Buat Asesmen Rekomendasi Guru (LATIHAN)
  const kataSandiTopic = topics.get("Kata sandi dan autentikasi")!;
  const privasiTopic = topics.get("Privasi dan data pribadi")!;

  const recAssessment7 = await prisma.assessment.create({
    data: {
      title: "Latihan: Kata sandi dan autentikasi",
      description: "Latihan penguatan keamanan digital dari Guru 1.",
      type: AssessmentType.LATIHAN,
      gradeLevel: 7,
      sourceTopicId: kataSandiTopic.id,
      isActive: true,
      createdById: teacher1.id,
      targetClasses: {
        create: [
          { classId: rosterClasses.get("7A")!.id },
          { classId: rosterClasses.get("7B")!.id },
        ],
      },
    },
  });

  const recAssessment8 = await prisma.assessment.create({
    data: {
      title: "Latihan: Privasi dan data pribadi",
      description: "Latihan penguatan privasi data dari Guru 2.",
      type: AssessmentType.LATIHAN,
      gradeLevel: 8,
      sourceTopicId: privasiTopic.id,
      isActive: true,
      createdById: teacher2.id,
      targetClasses: {
        create: [
          { classId: rosterClasses.get("8A")!.id },
          { classId: rosterClasses.get("8B")!.id },
        ],
      },
    },
  });

  // Hubungkan soal materi ke asesmen rekomendasi
  const kataSandiQuestions = await prisma.question.findMany({
    where: { topicId: kataSandiTopic.id },
    include: { options: true },
  });
  for (const [idx, q] of kataSandiQuestions.entries()) {
    await prisma.assessmentQuestion.create({
      data: { assessmentId: recAssessment7.id, questionId: q.id, order: idx + 1 },
    });
  }

  const privasiQuestions = await prisma.question.findMany({
    where: { topicId: privasiTopic.id },
    include: { options: true },
  });
  for (const [idx, q] of privasiQuestions.entries()) {
    await prisma.assessmentQuestion.create({
      data: { assessmentId: recAssessment8.id, questionId: q.id, order: idx + 1 },
    });
  }

  // 9. Sesi LATIHAN Historis (Termasuk 2 Siswa Banyak Latihan)
  // Membuktikan batas harian (POINTS_PRACTICE_DAILY_CAP = 20) dan bahwa latihan
  // tidak mempengaruhi peringkat angkatan atau analitik D-01!
  const heavyPracticeStudents = createdStudents.filter(
    (s) => s.username === "7a01" || s.username === "8a01",
  );

  for (const student of heavyPracticeStudents) {
    const isGrade7 = student.gradeLevel === 7;
    const questionsPool = isGrade7 ? kataSandiQuestions : privasiQuestions;
    const topic = isGrade7 ? kataSandiTopic : privasiTopic;

    // Sesi di 3 tanggal berbeda untuk menguji batas harian dan lencana RAJIN_BERLATIH
    const daysBack = [-8, -5, -2];

    for (const dOffset of daysBack) {
      const sessionDate = new Date(seedDate.getTime() + dOffset * 24 * 60 * 60 * 1000);
      let earnedToday = 0;

      // 2 sesi di hari yang sama untuk menguji daily cap
      for (let sIdx = 0; sIdx < 2; sIdx++) {
        const sTime = new Date(sessionDate.getTime() + sIdx * 60 * 60 * 1000);

        const practiceSession = await prisma.assessmentSession.create({
          data: {
            studentId: student.userId,
            kind: SessionKind.LATIHAN,
            assessmentId: isGrade7 ? recAssessment7.id : recAssessment8.id,
            topicId: topic.id,
            startedAt: sTime,
            finishedAt: new Date(sTime.getTime() + 15 * 60 * 1000),
          },
        });

        for (const q of questionsPool) {
          const correctOpt = q.options.find((o) => o.isCorrect)!;
          const isCorrect = true; // dijawab benar

          await prisma.answer.create({
            data: {
              sessionId: practiceSession.id,
              studentId: student.userId,
              questionId: q.id,
              selectedOptionId: correctOpt.id,
              isCorrect: true,
              answeredAt: sTime,
            },
          });

          const earnedForThisAnswer = calculatePracticePointsForAnswer(earnedToday, isCorrect);
          if (earnedForThisAnswer > 0) {
            await prisma.pointEvent.create({
              data: {
                studentId: student.userId,
                sessionId: practiceSession.id,
                type: PointEventType.LATIHAN_ANSWER,
                points: earnedForThisAnswer,
                createdAt: sTime,
              },
            });
            earnedToday += earnedForThisAnswer;
          }
        }
      }
    }
  }

  // Tambahkan 1-2 sesi latihan mandiri untuk segelintir siswa lainnya
  const occasionalPracticeStudents = createdStudents.filter(
    (s) => s.username === "7a02" || s.username === "7b01" || s.username === "8a02",
  );
  for (const student of occasionalPracticeStudents) {
    const isGrade7 = student.gradeLevel === 7;
    const questionsPool = isGrade7 ? kataSandiQuestions : privasiQuestions;
    const topic = isGrade7 ? kataSandiTopic : privasiTopic;
    const sTime = new Date(seedDate.getTime() - 3 * 24 * 60 * 60 * 1000);

    const session = await prisma.assessmentSession.create({
      data: {
        studentId: student.userId,
        kind: SessionKind.LATIHAN,
        topicId: topic.id,
        startedAt: sTime,
        finishedAt: new Date(sTime.getTime() + 10 * 60 * 1000),
      },
    });

    let earnedToday = 0;
    for (const q of questionsPool.slice(0, 3)) {
      const correctOpt = q.options.find((o) => o.isCorrect)!;
      await prisma.answer.create({
        data: {
          sessionId: session.id,
          studentId: student.userId,
          questionId: q.id,
          selectedOptionId: correctOpt.id,
          isCorrect: true,
          answeredAt: sTime,
        },
      });

      const earned = calculatePracticePointsForAnswer(earnedToday, true);
      if (earned > 0) {
        await prisma.pointEvent.create({
          data: {
            studentId: student.userId,
            sessionId: session.id,
            type: PointEventType.LATIHAN_ANSWER,
            points: earned,
            createdAt: sTime,
          },
        });
        earnedToday += earned;
      }
    }
  }

  // 10. Evaluasi dan Beri Lencana untuk Seluruh Siswa
  for (const student of createdStudents) {
    await evaluateAndAwardBadges(student.userId, seedDate);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
