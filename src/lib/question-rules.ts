import type { AssessmentStatus } from "@/lib/schedule";

export type QuestionInput = {
  text: unknown;
  explanation: unknown;
  difficulty: unknown;
  options: unknown;
};

export function validateQuestionInput(input: QuestionInput): string[] {
  const errors: string[] = [];
  if (typeof input.text !== "string" || !input.text.trim()) errors.push("Teks soal wajib diisi.");
  if (typeof input.explanation !== "string" || !input.explanation.trim()) errors.push("Penjelasan wajib diisi.");
  if (input.difficulty !== "EASY" && input.difficulty !== "MEDIUM" && input.difficulty !== "HARD") {
    errors.push("Pilih kesulitan yang valid.");
  }

  if (!Array.isArray(input.options) || input.options.length !== 4) {
    errors.push("Soal harus memiliki tepat 4 opsi.");
    return errors;
  }

  let correctCount = 0;
  const normalizedOptions = new Set<string>();
  input.options.forEach((value, index) => {
    if (typeof value !== "object" || value === null) {
      errors.push(`Opsi ${index + 1} tidak valid.`);
      return;
    }
    const option = value as { text?: unknown; isCorrect?: unknown };
    if (typeof option.text !== "string" || !option.text.trim()) {
      errors.push(`Teks opsi ${index + 1} wajib diisi.`);
    } else {
      const normalized = option.text.trim().toLocaleLowerCase("id-ID");
      if (normalizedOptions.has(normalized)) errors.push("Teks setiap opsi harus berbeda.");
      normalizedOptions.add(normalized);
    }
    if (typeof option.isCorrect !== "boolean") {
      errors.push(`Tentukan apakah opsi ${index + 1} merupakan jawaban benar.`);
    } else if (option.isCorrect) {
      correctCount += 1;
    }
  });
  if (correctCount !== 1) errors.push("Tepat satu opsi harus ditandai sebagai jawaban benar.");
  return errors;
}

export function isQuestionLocked(
  hasAnswers: boolean,
  assessmentStatuses: AssessmentStatus[],
): boolean {
  return hasAnswers || assessmentStatuses.some((status) => status !== "Dijadwalkan");
}
