import { describe, expect, it } from "vitest";
import questions from "./questions.json";
import { validateQuestions } from "./validateQuestions";

describe("questions.json", () => {
  it("memuat 12 materi dengan soal dan opsi yang valid", () => {
    expect(validateQuestions(questions)).toEqual([]);
  });
});
