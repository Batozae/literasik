/**
 * analytics.test.ts – Unit test untuk analytics.ts (Fase 3)
 * Jalankan: npm test
 */

import { describe, it, expect } from "vitest";
import {
  computeTopicDifficulties,
  computeStudentStatus,
  computePillarScores,
  computeTrendExtended,
  sanitizeCsvCell,
  toCsvRow,
  buildCsv,
  applyPeriodFilter,
  type RawAnswer,
  type RawAnswerWithSession,
  type RawAssessment,
} from "@/lib/analytics";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAnswer(
  overrides: Partial<RawAnswer> & { studentId: number; topicId: number; isCorrect: boolean },
): RawAnswer {
  return {
    questionId: 1,
    answeredAt: new Date("2026-10-01T08:00:00Z"),
    ...overrides,
  };
}

function makeAnswerWithSession(
  overrides: Partial<RawAnswerWithSession> & {
    studentId: number;
    topicId: number;
    isCorrect: boolean;
    sessionId: number;
    assessmentId: number | null;
  },
): RawAnswerWithSession {
  return {
    questionId: 1,
    answeredAt: new Date("2026-10-01T08:00:00Z"),
    ...overrides,
  };
}

const TOPICS = [
  { id: 1, name: "Phishing", pillarCode: "KEAMANAN" },
  { id: 2, name: "Etika Medsos", pillarCode: "ETIKA" },
  { id: 3, name: "Kata Sandi", pillarCode: "KEAMANAN" },
];

const PILLARS = [
  { code: "KEAMANAN", name: "Keamanan" },
  { code: "ETIKA", name: "Etika" },
];

// ── computeTopicDifficulties ─────────────────────────────────────────────────

describe("computeTopicDifficulties", () => {
  it("mengembalikan 'Data belum cukup' jika jawaban < 10", () => {
    const answers = Array.from({ length: 9 }, (_, i) =>
      makeAnswer({ studentId: i + 1, topicId: 1, isCorrect: false }),
    );
    const result = computeTopicDifficulties(answers, TOPICS);
    const topic1 = result.find((r) => r.topicId === 1)!;
    expect(topic1.category).toBe("Data belum cukup");
    expect(topic1.accuracy).toBeNull();
  });

  it("mengembalikan 'Sulit' jika akurasi < 60%", () => {
    // 10 jawaban, 5 benar = 50%
    const answers = [
      ...Array.from({ length: 5 }, (_, i) => makeAnswer({ studentId: i + 1, topicId: 1, isCorrect: true })),
      ...Array.from({ length: 5 }, (_, i) => makeAnswer({ studentId: i + 6, topicId: 1, isCorrect: false })),
    ];
    const result = computeTopicDifficulties(answers, TOPICS);
    const topic1 = result.find((r) => r.topicId === 1)!;
    expect(topic1.category).toBe("Sulit");
    expect(topic1.accuracy).toBeCloseTo(0.5);
  });

  it("mengembalikan 'Sedang' jika akurasi 60%-79%", () => {
    // 10 jawaban, 7 benar = 70%
    const answers = [
      ...Array.from({ length: 7 }, (_, i) => makeAnswer({ studentId: i + 1, topicId: 2, isCorrect: true })),
      ...Array.from({ length: 3 }, (_, i) => makeAnswer({ studentId: i + 8, topicId: 2, isCorrect: false })),
    ];
    const result = computeTopicDifficulties(answers, TOPICS);
    const topic2 = result.find((r) => r.topicId === 2)!;
    expect(topic2.category).toBe("Sedang");
  });

  it("mengembalikan 'Mudah' jika akurasi >= 80%", () => {
    // 10 jawaban, 9 benar = 90%
    const answers = [
      ...Array.from({ length: 9 }, (_, i) => makeAnswer({ studentId: i + 1, topicId: 2, isCorrect: true })),
      makeAnswer({ studentId: 10, topicId: 2, isCorrect: false }),
    ];
    const result = computeTopicDifficulties(answers, TOPICS);
    const topic2 = result.find((r) => r.topicId === 2)!;
    expect(topic2.category).toBe("Mudah");
  });

  it("mengurutkan dari akurasi terendah, Data belum cukup di bawah", () => {
    const answers = [
      // topik 1: 10 jawaban, 4 benar = 40% (Sulit)
      ...Array.from({ length: 4 }, (_, i) => makeAnswer({ studentId: i + 1, topicId: 1, isCorrect: true })),
      ...Array.from({ length: 6 }, (_, i) => makeAnswer({ studentId: i + 5, topicId: 1, isCorrect: false })),
      // topik 2: 10 jawaban, 8 benar = 80% (Mudah)
      ...Array.from({ length: 8 }, (_, i) => makeAnswer({ studentId: i + 1, topicId: 2, isCorrect: true })),
      ...Array.from({ length: 2 }, (_, i) => makeAnswer({ studentId: i + 9, topicId: 2, isCorrect: false })),
      // topik 3: 5 jawaban (Data belum cukup)
      ...Array.from({ length: 5 }, (_, i) => makeAnswer({ studentId: i + 1, topicId: 3, isCorrect: false })),
    ];
    const result = computeTopicDifficulties(answers, TOPICS);
    expect(result[0].topicId).toBe(1); // Sulit (40%) dulu
    expect(result[1].topicId).toBe(2); // Mudah (80%)
    expect(result[2].topicId).toBe(3); // Data belum cukup di bawah
  });
});

// ── computeStudentStatus ─────────────────────────────────────────────────────

describe("computeStudentStatus", () => {
  const topicNames = [
    { id: 1, name: "Phishing" },
    { id: 2, name: "Etika Medsos" },
    { id: 3, name: "Kata Sandi" },
    { id: 4, name: "Privasi" },
  ];

  it("Belum Cukup Data: tidak ada topik dengan >= 3 jawaban dan total < 10", () => {
    // 2 jawaban di topik 1, 2 jawaban di topik 2 → total 4, tidak ada topik >= 3 jawaban
    const answers = [
      makeAnswer({ studentId: 1, topicId: 1, isCorrect: false }),
      makeAnswer({ studentId: 1, topicId: 1, isCorrect: false }),
      makeAnswer({ studentId: 1, topicId: 2, isCorrect: false }),
      makeAnswer({ studentId: 1, topicId: 2, isCorrect: false }),
    ];
    const result = computeStudentStatus(1, answers, topicNames);
    expect(result.status).toBe("Belum Cukup Data");
    expect(result.weakTopics).toHaveLength(0);
  });

  it("Perlu Pendampingan: materi lemah >= 2", () => {
    // Topik 1: 3 jawaban, 0 benar (0% < 60%)
    // Topik 2: 3 jawaban, 0 benar (0% < 60%)
    const answers = [
      ...Array.from({ length: 3 }, () => makeAnswer({ studentId: 1, topicId: 1, isCorrect: false })),
      ...Array.from({ length: 3 }, () => makeAnswer({ studentId: 1, topicId: 2, isCorrect: false })),
    ];
    const result = computeStudentStatus(1, answers, topicNames);
    expect(result.status).toBe("Perlu Pendampingan");
    expect(result.weakTopics).toHaveLength(2);
  });

  it("Perlu Pendampingan: total >= 10 dan akurasi < 50%", () => {
    // 10 jawaban, 4 benar = 40%
    // Hanya 1 topik dengan >= 3 jawaban tapi akurasi 40% < 60%
    const answers = [
      ...Array.from({ length: 4 }, () => makeAnswer({ studentId: 1, topicId: 1, isCorrect: true })),
      ...Array.from({ length: 6 }, () => makeAnswer({ studentId: 1, topicId: 1, isCorrect: false })),
    ];
    const result = computeStudentStatus(1, answers, topicNames);
    // akurasi keseluruhan = 40% < 50%, topik lemah = 1 (40% < 60%) → Perlu Pendampingan
    expect(result.status).toBe("Perlu Pendampingan");
  });

  it("Pantau: tepat 1 materi lemah", () => {
    // Topik 1: 3 jawaban, 1 benar = 33% (lemah)
    // Topik 2: 3 jawaban, 3 benar = 100%
    const answers = [
      ...Array.from({ length: 1 }, () => makeAnswer({ studentId: 1, topicId: 1, isCorrect: true })),
      ...Array.from({ length: 2 }, () => makeAnswer({ studentId: 1, topicId: 1, isCorrect: false })),
      ...Array.from({ length: 3 }, () => makeAnswer({ studentId: 1, topicId: 2, isCorrect: true })),
    ];
    const result = computeStudentStatus(1, answers, topicNames);
    expect(result.status).toBe("Pantau");
    expect(result.weakTopics).toHaveLength(1);
    expect(result.weakTopics[0]).toBe("Phishing");
  });

  it("Aman: tidak ada materi lemah dan data cukup", () => {
    // 10 jawaban, semua benar
    const answers = [
      ...Array.from({ length: 5 }, () => makeAnswer({ studentId: 1, topicId: 1, isCorrect: true })),
      ...Array.from({ length: 5 }, () => makeAnswer({ studentId: 1, topicId: 2, isCorrect: true })),
    ];
    const result = computeStudentStatus(1, answers, topicNames);
    expect(result.status).toBe("Aman");
    expect(result.weakTopics).toHaveLength(0);
  });

  it("hanya menghitung jawaban milik studentId yang diberikan", () => {
    // Jawaban siswa 1 (baik) dan siswa 2 (buruk) tercampur
    const answers = [
      ...Array.from({ length: 5 }, () => makeAnswer({ studentId: 1, topicId: 1, isCorrect: true })),
      ...Array.from({ length: 5 }, () => makeAnswer({ studentId: 2, topicId: 1, isCorrect: false })),
    ];
    const result = computeStudentStatus(1, answers, topicNames);
    // Siswa 1: 5 jawaban, 5 benar = 100% → tapi hanya 5 total < 10 dan satu topik >= 3
    // topik 1: 5 jawaban, 5 benar = 100% → tidak lemah → Aman
    expect(result.status).toBe("Aman");
    expect(result.totalAnswers).toBe(5);
  });
});

// ── computePillarScores ───────────────────────────────────────────────────────

describe("computePillarScores", () => {
  it("menghitung akurasi per pilar dengan benar", () => {
    const topicToPillar = new Map([
      [1, "KEAMANAN"],
      [2, "ETIKA"],
      [3, "KEAMANAN"],
    ]);
    const answers: RawAnswer[] = [
      makeAnswer({ studentId: 1, topicId: 1, isCorrect: true }),
      makeAnswer({ studentId: 1, topicId: 1, isCorrect: false }),
      makeAnswer({ studentId: 1, topicId: 3, isCorrect: true }),
      makeAnswer({ studentId: 1, topicId: 2, isCorrect: true }),
      makeAnswer({ studentId: 1, topicId: 2, isCorrect: true }),
    ];
    const result = computePillarScores(answers, PILLARS, topicToPillar);
    const keamanan = result.find((r) => r.pillarCode === "KEAMANAN")!;
    const etika = result.find((r) => r.pillarCode === "ETIKA")!;
    // KEAMANAN: 3 jawaban, 2 benar = 66.7%
    expect(keamanan.accuracy).toBeCloseTo(2 / 3);
    // ETIKA: 2 jawaban, 2 benar = 100%
    expect(etika.accuracy).toBeCloseTo(1);
  });

  it("mengembalikan accuracy null jika tidak ada jawaban untuk pilar", () => {
    const topicToPillar = new Map([[1, "KEAMANAN"]]);
    const answers: RawAnswer[] = [];
    const result = computePillarScores(answers, PILLARS, topicToPillar);
    expect(result.find((r) => r.pillarCode === "ETIKA")!.accuracy).toBeNull();
  });
});

// ── computeTrendExtended ──────────────────────────────────────────────────────

describe("computeTrendExtended", () => {
  const assessments: RawAssessment[] = [
    {
      id: 10,
      title: "Asesmen Phishing",
      opensAt: new Date("2026-09-01T00:00:00Z"),
      closesAt: new Date("2026-09-01T12:00:00Z"),
      gradeLevel: 7,
      sourceTopicId: 1,
      topicName: "Phishing",
      pillarCode: "KEAMANAN",
    },
    {
      id: 11,
      title: "Asesmen Etika",
      opensAt: new Date("2026-09-15T00:00:00Z"),
      closesAt: new Date("2026-09-15T12:00:00Z"),
      gradeLevel: 7,
      sourceTopicId: 2,
      topicName: "Etika Medsos",
      pillarCode: "ETIKA",
    },
  ];

  it("menghasilkan titik tren per asesmen diurut opensAt", () => {
    const answers: RawAnswerWithSession[] = [
      makeAnswerWithSession({ studentId: 1, topicId: 1, isCorrect: true, sessionId: 1, assessmentId: 10 }),
      makeAnswerWithSession({ studentId: 2, topicId: 1, isCorrect: false, sessionId: 2, assessmentId: 10 }),
      makeAnswerWithSession({ studentId: 1, topicId: 2, isCorrect: true, sessionId: 3, assessmentId: 11 }),
      makeAnswerWithSession({ studentId: 2, topicId: 2, isCorrect: true, sessionId: 4, assessmentId: 11 }),
    ];
    const result = computeTrendExtended(answers, assessments);
    expect(result).toHaveLength(2);
    expect(result[0].assessmentId).toBe(10);
    expect(result[0].accuracy).toBeCloseTo(0.5);
    expect(result[0].participantCount).toBe(2);
    expect(result[1].assessmentId).toBe(11);
    expect(result[1].accuracy).toBeCloseTo(1);
  });

  it("tidak memasukkan asesmen tanpa opensAt", () => {
    const asmNoDate: RawAssessment[] = [
      { ...assessments[0], opensAt: null },
    ];
    const answers: RawAnswerWithSession[] = [
      makeAnswerWithSession({ studentId: 1, topicId: 1, isCorrect: true, sessionId: 1, assessmentId: 10 }),
    ];
    const result = computeTrendExtended(answers, asmNoDate);
    expect(result).toHaveLength(0);
  });
});

// ── applyPeriodFilter ─────────────────────────────────────────────────────────

describe("applyPeriodFilter", () => {
  const now = new Date("2026-11-01T12:00:00Z");

  it("kind=all selalu true", () => {
    expect(applyPeriodFilter(new Date("2020-01-01"), { kind: "all" }, now)).toBe(true);
  });

  it("kind=days 7 hari: jawaban 3 hari lalu = true", () => {
    const date = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(applyPeriodFilter(date, { kind: "days", days: 7 }, now)).toBe(true);
  });

  it("kind=days 7 hari: jawaban 10 hari lalu = false", () => {
    const date = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    expect(applyPeriodFilter(date, { kind: "days", days: 7 }, now)).toBe(false);
  });

  it("kind=custom: dalam rentang = true", () => {
    const from = new Date("2026-10-01");
    const to = new Date("2026-10-31");
    expect(applyPeriodFilter(new Date("2026-10-15"), { kind: "custom", from, to }, now)).toBe(true);
  });

  it("kind=custom: di luar rentang = false", () => {
    const from = new Date("2026-10-01");
    const to = new Date("2026-10-31");
    expect(applyPeriodFilter(new Date("2026-11-01"), { kind: "custom", from, to }, now)).toBe(false);
  });
});

// ── CSV helpers ───────────────────────────────────────────────────────────────

describe("sanitizeCsvCell", () => {
  it("awalan '=' diberi '", () => {
    expect(sanitizeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
  });
  it("awalan '+' diberi '", () => {
    expect(sanitizeCsvCell("+foo")).toBe("'+foo");
  });
  it("awalan '-' diberi '", () => {
    expect(sanitizeCsvCell("-foo")).toBe("'-foo");
  });
  it("awalan '@' diberi '", () => {
    expect(sanitizeCsvCell("@foo")).toBe("'@foo");
  });
  it("teks normal tidak berubah", () => {
    expect(sanitizeCsvCell("hello")).toBe("hello");
  });
});

describe("toCsvRow", () => {
  it("menghasilkan baris CSV yang benar", () => {
    expect(toCsvRow(["hello", 42, null])).toBe("hello,42,");
  });
  it("mengutip nilai dengan koma", () => {
    expect(toCsvRow(["a,b"])).toBe('"a,b"');
  });
});

describe("buildCsv", () => {
  it("dimulai dengan BOM UTF-8", () => {
    const csv = buildCsv(["Nama", "Nilai"], [["Andi", 90]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Nama,Nilai");
    expect(csv).toContain("Andi,90");
  });
});
