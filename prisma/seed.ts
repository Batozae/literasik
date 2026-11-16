import { PrismaClient, Role, AssessmentType, Difficulty } from "@prisma/client";
import bcrypt from "bcryptjs";
import questions from "./data/questions.json";
import { EXPECTED_TOPICS, validateQuestions } from "./data/validateQuestions";

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
  for (const character of seedText) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
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

  const pillarRecords = new Map<string, { id: number; name: string }>();
  for (const pillar of PILLARS) {
    const record = await prisma.pillar.create({ data: pillar });
    pillarRecords.set(pillar.code, record);
  }

  const topics = new Map<string, { id: number; gradeLevel: number }>();
  for (const item of EXPECTED_TOPICS) {
    const pillarName = item.name === "Pencarian dan penilaian informasi" || item.name === "Komunikasi dan kolaborasi daring" || item.name === "Pengelolaan berkas dan penyimpanan daring"
      ? "KECAKAPAN"
      : item.name === "Etika bermedia sosial" || item.name === "Perundungan siber" || item.name === "Hak cipta dan plagiarisme"
        ? "ETIKA"
        : item.name === "Kata sandi dan autentikasi" || item.name === "Phishing dan penipuan online" || item.name === "Privasi dan data pribadi"
          ? "KEAMANAN"
          : "BUDAYA";
    const pillar = pillarRecords.get(pillarName)!;
    const topic = await prisma.topic.create({
      data: { name: item.name, gradeLevel: item.gradeLevel, pillarId: pillar.id },
    });
    topics.set(item.name, topic);
  }

  for (const badge of BADGES) await prisma.badge.create({ data: badge });

  const teacher1 = await prisma.user.create({
    data: { name: "Guru 1", username: "guru1", passwordHash: teacherPasswordHash, role: Role.TEACHER },
  });
  const teacher2 = await prisma.user.create({
    data: { name: "Guru 2", username: "guru2", passwordHash: teacherPasswordHash, role: Role.TEACHER },
  });
  const teachers = new Map([["guru1", teacher1], ["guru2", teacher2]]);

  const rosterClasses = new Map<string, { id: number; gradeLevel: number }>();
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
      const user = await prisma.user.create({
        data: {
          name: `${firstName} ${lastName}`,
          username: `${roster.name.toLowerCase()}${String(classIndex).padStart(2, "0")}`,
          passwordHash: studentPasswordHash,
          role: Role.STUDENT,
        },
      });
      await prisma.studentProfile.create({ data: { userId: user.id, classId: classRecord.id } });
    }
  }

  const seedDate = new Date();
  const dayOffsets = [-18, -14, -11, -7, -4, 3];
  for (const gradeLevel of [7, 8]) {
    const teacher = teachers.get(gradeLevel === 7 ? "guru1" : "guru2")!;
    const gradeTopics = EXPECTED_TOPICS.filter((topic) => topic.gradeLevel === gradeLevel);
    for (const [topicIndex, expectedTopic] of gradeTopics.entries()) {
      const topic = topics.get(expectedTopic.name)!;
      const topicQuestions = questionByTopic.get(expectedTopic.name)!;
      const random = makeRandom(`literasik-options-${expectedTopic.name}`);
      const { opensAt, closesAt } = assessmentWindow(seedDate, dayOffsets[topicIndex]);
      const assessmentQuestions = [];

      for (const [order, item] of topicQuestions.entries()) {
        const shuffledOptions = shuffled(item.options, random);
        assessmentQuestions.push({
          order: order + 1,
          question: {
            create: {
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
          },
        });
      }

      await prisma.assessment.create({
        data: {
          title: expectedTopic.name,
          type: AssessmentType.WAJIB,
          gradeLevel,
          opensAt,
          closesAt,
          isActive: true,
          createdById: teacher.id,
          questions: { create: assessmentQuestions },
        },
      });
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
