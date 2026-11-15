export const EXPECTED_TOPICS = [
  { name: "Pencarian dan penilaian informasi", gradeLevel: 7 },
  { name: "Komunikasi dan kolaborasi daring", gradeLevel: 7 },
  { name: "Etika bermedia sosial", gradeLevel: 7 },
  { name: "Kata sandi dan autentikasi", gradeLevel: 7 },
  { name: "Phishing dan penipuan online", gradeLevel: 7 },
  { name: "Jejak digital dan reputasi", gradeLevel: 7 },
  { name: "Pengelolaan berkas dan penyimpanan daring", gradeLevel: 8 },
  { name: "Perundungan siber", gradeLevel: 8 },
  { name: "Hak cipta dan plagiarisme", gradeLevel: 8 },
  { name: "Privasi dan data pribadi", gradeLevel: 8 },
  { name: "Hoaks dan verifikasi informasi", gradeLevel: 8 },
  { name: "Keberagaman dan toleransi di ruang digital", gradeLevel: 8 },
] as const;

const DIFFICULTIES = new Set(["EASY", "MEDIUM", "HARD"]);

/** Mengembalikan daftar masalah; daftar kosong berarti data valid. */
export function validateQuestions(value: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(value)) return ["Data soal harus berupa array."];

  if (value.length !== EXPECTED_TOPICS.length) {
    errors.push(`Harus ada tepat ${EXPECTED_TOPICS.length} materi.`);
  }

  const seenTopics = new Set<string>();
  for (const topicData of value) {
    if (typeof topicData !== "object" || topicData === null) {
      errors.push("Setiap materi harus berupa objek.");
      continue;
    }

    const topic = topicData as { topic?: unknown; items?: unknown };
    if (typeof topic.topic !== "string" || !EXPECTED_TOPICS.some((item) => item.name === topic.topic)) {
      errors.push(`Nama materi tidak dikenal: ${String(topic.topic)}.`);
      continue;
    }
    if (seenTopics.has(topic.topic)) errors.push(`Materi duplikat: ${topic.topic}.`);
    seenTopics.add(topic.topic);

    if (!Array.isArray(topic.items) || topic.items.length !== 5) {
      errors.push(`${topic.topic}: harus memiliki tepat 5 soal.`);
      continue;
    }

    topic.items.forEach((item, index) => {
      const label = `${topic.topic}, soal ${index + 1}`;
      if (typeof item !== "object" || item === null) {
        errors.push(`${label}: soal harus berupa objek.`);
        return;
      }
      const question = item as {
        text?: unknown;
        difficulty?: unknown;
        explanation?: unknown;
        options?: unknown;
      };
      if (typeof question.text !== "string" || !question.text.trim()) errors.push(`${label}: teks kosong.`);
      if (typeof question.explanation !== "string" || !question.explanation.trim()) errors.push(`${label}: penjelasan kosong.`);
      if (typeof question.difficulty !== "string" || !DIFFICULTIES.has(question.difficulty)) {
        errors.push(`${label}: difficulty harus EASY, MEDIUM, atau HARD.`);
      }
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        errors.push(`${label}: harus memiliki tepat 4 opsi.`);
        return;
      }
      let correctCount = 0;
      question.options.forEach((option, optionIndex) => {
        if (typeof option !== "object" || option === null) {
          errors.push(`${label}, opsi ${optionIndex + 1}: harus berupa objek.`);
          return;
        }
        const answerOption = option as { text?: unknown; isCorrect?: unknown };
        if (typeof answerOption.text !== "string" || !answerOption.text.trim()) {
          errors.push(`${label}, opsi ${optionIndex + 1}: teks kosong.`);
        }
        if (typeof answerOption.isCorrect !== "boolean") {
          errors.push(`${label}, opsi ${optionIndex + 1}: isCorrect harus boolean.`);
        } else if (answerOption.isCorrect) {
          correctCount += 1;
        }
      });
      if (correctCount !== 1) errors.push(`${label}: harus tepat 1 opsi benar.`);
    });
  }

  for (const expected of EXPECTED_TOPICS) {
    if (!seenTopics.has(expected.name)) errors.push(`Materi wajib tidak ditemukan: ${expected.name}.`);
  }
  return errors;
}
