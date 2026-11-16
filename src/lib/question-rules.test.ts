import { describe, expect, it } from "vitest";
import { isQuestionLocked, validateQuestionInput } from "@/lib/question-rules";

const validInput = {
  text: "Teks soal",
  explanation: "Penjelasan soal",
  difficulty: "EASY",
  options: [
    { text: "Opsi A", isCorrect: true },
    { text: "Opsi B", isCorrect: false },
    { text: "Opsi C", isCorrect: false },
    { text: "Opsi D", isCorrect: false },
  ],
};

describe("question rules", () => {
  it("menolak jumlah jawaban benar yang bukan satu", () => {
    expect(validateQuestionInput({ ...validInput, options: validInput.options.map((option) => ({ ...option, isCorrect: false })) })).toContain("Tepat satu opsi harus ditandai sebagai jawaban benar.");
    expect(validateQuestionInput({ ...validInput, options: validInput.options.map((option, index) => ({ ...option, isCorrect: index < 2 })) })).toContain("Tepat satu opsi harus ditandai sebagai jawaban benar.");
  });

  it("menolak opsi kosong dan teks opsi kembar", () => {
    const emptyOptions = validInput.options.map((option, index) => index === 2 ? { ...option, text: " " } : option);
    expect(validateQuestionInput({ ...validInput, options: emptyOptions }).some((error) => error.includes("Teks opsi 3"))).toBe(true);
    const duplicateOptions = validInput.options.map((option, index) => index === 1 ? { ...option, text: " opsi a " } : option);
    expect(validateQuestionInput({ ...validInput, options: duplicateOptions })).toContain("Teks setiap opsi harus berbeda.");
  });

  it("menolak teks soal atau penjelasan kosong", () => {
    const errors = validateQuestionInput({ ...validInput, text: " ", explanation: "" });
    expect(errors).toContain("Teks soal wajib diisi.");
    expect(errors).toContain("Penjelasan wajib diisi.");
  });

  it("mengunci soal yang sudah dijawab atau dipakai setelah asesmen dibuka", () => {
    expect(isQuestionLocked(true, [])).toBe(true);
    expect(isQuestionLocked(false, ["Berlangsung"])).toBe(true);
    expect(isQuestionLocked(false, ["Ditutup"])).toBe(true);
  });

  it("membiarkan soal bebas atau yang hanya ada di asesmen terjadwal tetap dapat diedit", () => {
    expect(isQuestionLocked(false, [])).toBe(false);
    expect(isQuestionLocked(false, ["Dijadwalkan"])).toBe(false);
  });
});
