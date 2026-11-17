import { describe, expect, it } from "vitest";
import {
  calculateLevel,
  calculateWajibPoints,
  calculatePracticePointsForAnswer,
  formatLeaderboardName,
  sortAndRankLeaderboard,
  evaluateBadges,
  type LeaderboardCandidate,
  type BadgeEvaluationContext,
} from "./scoring";

describe("scoring.ts", () => {
  describe("calculateLevel", () => {
    it("returns level 1 for 0 points", () => {
      const res = calculateLevel(0);
      expect(res.level).toBe(1);
      expect(res.currentLevelThreshold).toBe(0);
      expect(res.nextLevelThreshold).toBe(60);
      expect(res.pointsToNext).toBe(60);
      expect(res.progressPercent).toBe(0);
    });

    it("calculates correct progress within level 1", () => {
      const res = calculateLevel(30);
      expect(res.level).toBe(1);
      expect(res.pointsToNext).toBe(30);
      expect(res.progressPercent).toBe(50);
    });

    it("transitions to level 2 at 60 points", () => {
      const res = calculateLevel(60);
      expect(res.level).toBe(2);
      expect(res.currentLevelThreshold).toBe(60);
      expect(res.nextLevelThreshold).toBe(150);
      expect(res.pointsToNext).toBe(90);
      expect(res.progressPercent).toBe(0);
    });

    it("calculates progress within level 2 (60 to 150)", () => {
      const res = calculateLevel(105);
      expect(res.level).toBe(2);
      expect(res.pointsToNext).toBe(45);
      expect(res.progressPercent).toBe(50);
    });

    it("transitions to level 3 at 150 points", () => {
      const res = calculateLevel(150);
      expect(res.level).toBe(3);
      expect(res.currentLevelThreshold).toBe(150);
      expect(res.nextLevelThreshold).toBe(250);
      expect(res.pointsToNext).toBe(100);
      expect(res.progressPercent).toBe(0);
    });

    it("transitions to level 4 at 250 points", () => {
      const res = calculateLevel(250);
      expect(res.level).toBe(4);
      expect(res.currentLevelThreshold).toBe(250);
      expect(res.nextLevelThreshold).toBe(350);
      expect(res.pointsToNext).toBe(100);
      expect(res.progressPercent).toBe(0);
    });

    it("transitions to level 5 (max level) at 350+ points", () => {
      const res = calculateLevel(350);
      expect(res.level).toBe(5);
      expect(res.currentLevelThreshold).toBe(350);
      expect(res.nextLevelThreshold).toBeNull();
      expect(res.pointsToNext).toBe(0);
      expect(res.progressPercent).toBe(100);

      const resOver = calculateLevel(500);
      expect(resOver.level).toBe(5);
      expect(resOver.nextLevelThreshold).toBeNull();
      expect(resOver.pointsToNext).toBe(0);
      expect(resOver.progressPercent).toBe(100);
    });
  });

  describe("calculateWajibPoints", () => {
    it("calculates 10 points per correct answer without bonus", () => {
      const res = calculateWajibPoints(3, false);
      expect(res.answerPoints).toBe(30);
      expect(res.bonusPoints).toBe(0);
      expect(res.totalEarned).toBe(30);
    });

    it("calculates 10 points per correct answer with bonus 20", () => {
      const res = calculateWajibPoints(5, true);
      expect(res.answerPoints).toBe(50);
      expect(res.bonusPoints).toBe(20);
      expect(res.totalEarned).toBe(70);
    });

    it("awards only bonus if 0 correct but eligible for bonus", () => {
      const res = calculateWajibPoints(0, true);
      expect(res.answerPoints).toBe(0);
      expect(res.bonusPoints).toBe(20);
      expect(res.totalEarned).toBe(20);
    });
  });

  describe("calculatePracticePointsForAnswer", () => {
    it("returns 0 points if answer is incorrect", () => {
      expect(calculatePracticePointsForAnswer(0, false)).toBe(0);
      expect(calculatePracticePointsForAnswer(10, false)).toBe(0);
    });

    it("returns 2 points if correct and under daily cap", () => {
      expect(calculatePracticePointsForAnswer(0, true)).toBe(2);
      expect(calculatePracticePointsForAnswer(10, true)).toBe(2);
      expect(calculatePracticePointsForAnswer(18, true)).toBe(2);
    });

    it("caps points when nearing daily cap of 20", () => {
      expect(calculatePracticePointsForAnswer(19, true)).toBe(1);
    });

    it("returns 0 points if daily cap is already reached or exceeded", () => {
      expect(calculatePracticePointsForAnswer(20, true)).toBe(0);
      expect(calculatePracticePointsForAnswer(22, true)).toBe(0);
    });
  });

  describe("formatLeaderboardName", () => {
    it("formats two-word name with last initial and class", () => {
      expect(formatLeaderboardName("Aditya Pratama", "7A")).toBe("Aditya P. (7A)");
    });

    it("formats single-word name", () => {
      expect(formatLeaderboardName("Citra", "7B")).toBe("Citra (7B)");
    });

    it("formats three-word name with first name and final word initial", () => {
      expect(formatLeaderboardName("Siti Ayu Putri", "8A")).toBe("Siti P. (8A)");
    });
  });

  describe("sortAndRankLeaderboard", () => {
    it("sorts by wajib points desc, accuracy desc, name asc", () => {
      const candidates: LeaderboardCandidate[] = [
        { studentId: 1, name: "Budi Santoso", className: "7A", wajibPoints: 60, wajibAccuracy: 0.8 },
        { studentId: 2, name: "Andi Wijaya", className: "7A", wajibPoints: 70, wajibAccuracy: 0.7 },
        { studentId: 3, name: "Citra Dewi", className: "7A", wajibPoints: 60, wajibAccuracy: 0.9 },
        { studentId: 4, name: "Ahmad Fajar", className: "7A", wajibPoints: 60, wajibAccuracy: 0.8 },
        { studentId: 5, name: "Dina Zero", className: "7A", wajibPoints: 0, wajibAccuracy: 0 },
      ];

      const ranked = sortAndRankLeaderboard(candidates);

      // Student 5 with 0 points should be excluded (D-07)
      expect(ranked).toHaveLength(4);
      expect(ranked.find((r) => r.studentId === 5)).toBeUndefined();

      // Rank 1: Andi (70 points)
      expect(ranked[0].studentId).toBe(2);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].formattedName).toBe("Andi W. (7A)");

      // Rank 2: Citra (60 points, 0.9 accuracy)
      expect(ranked[1].studentId).toBe(3);
      expect(ranked[1].rank).toBe(2);

      // Rank 3: Ahmad Fajar vs Budi Santoso (both 60 pts, 0.8 acc -> Ahmad before Budi alphabetically)
      expect(ranked[2].studentId).toBe(4);
      expect(ranked[2].rank).toBe(3);

      // Rank 4: Budi Santoso
      expect(ranked[3].studentId).toBe(1);
      expect(ranked[3].rank).toBe(4);
    });
  });

  describe("evaluateBadges", () => {
    it("awards LANGKAH_PERTAMA on 1 completed WAJIB session", () => {
      const context: BadgeEvaluationContext = {
        completedSessions: [
          {
            sessionId: 1,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-01T08:00:00Z"),
            assessmentId: 101,
            totalQuestions: 5,
            correctAnswers: 3,
            allCorrect: false,
            pillarCode: "KECAKAPAN",
          },
        ],
        gradePillarsInfo: [],
      };

      const badges = evaluateBadges(context);
      expect(badges).toContain("LANGKAH_PERTAMA");
      expect(badges).not.toContain("TELITI");
    });

    it("awards TELITI when all questions are correct in a WAJIB session", () => {
      const context: BadgeEvaluationContext = {
        completedSessions: [
          {
            sessionId: 1,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-01T08:00:00Z"),
            assessmentId: 101,
            totalQuestions: 5,
            correctAnswers: 5,
            allCorrect: true,
            pillarCode: "KECAKAPAN",
          },
        ],
        gradePillarsInfo: [],
      };

      const badges = evaluateBadges(context);
      expect(badges).toContain("LANGKAH_PERTAMA");
      expect(badges).toContain("TELITI");
    });

    it("awards KONSISTEN when sessions completed across 3 distinct WIB dates", () => {
      const context: BadgeEvaluationContext = {
        completedSessions: [
          {
            sessionId: 1,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-01T03:00:00Z"), // Nov 1 WIB
            totalQuestions: 5,
            correctAnswers: 3,
            allCorrect: false,
          },
          {
            sessionId: 2,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-04T03:00:00Z"), // Nov 4 WIB
            totalQuestions: 5,
            correctAnswers: 3,
            allCorrect: false,
          },
          {
            sessionId: 3,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-08T03:00:00Z"), // Nov 8 WIB
            totalQuestions: 5,
            correctAnswers: 3,
            allCorrect: false,
          },
        ],
        gradePillarsInfo: [],
      };

      const badges = evaluateBadges(context);
      expect(badges).toContain("KONSISTEN");
    });

    it("awards PENJELAJAH when all 4 pillars completed in WAJIB", () => {
      const context: BadgeEvaluationContext = {
        completedSessions: [
          {
            sessionId: 1,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-01T03:00:00Z"),
            totalQuestions: 5,
            correctAnswers: 3,
            allCorrect: false,
            pillarCode: "KECAKAPAN",
          },
          {
            sessionId: 2,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-02T03:00:00Z"),
            totalQuestions: 5,
            correctAnswers: 3,
            allCorrect: false,
            pillarCode: "ETIKA",
          },
          {
            sessionId: 3,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-03T03:00:00Z"),
            totalQuestions: 5,
            correctAnswers: 3,
            allCorrect: false,
            pillarCode: "KEAMANAN",
          },
          {
            sessionId: 4,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-04T03:00:00Z"),
            totalQuestions: 5,
            correctAnswers: 3,
            allCorrect: false,
            pillarCode: "BUDAYA",
          },
        ],
        gradePillarsInfo: [],
      };

      const badges = evaluateBadges(context);
      expect(badges).toContain("PENJELAJAH");
    });

    it("awards RAJIN_BERLATIH on 3 completed LATIHAN sessions", () => {
      const context: BadgeEvaluationContext = {
        completedSessions: [
          {
            sessionId: 1,
            kind: "LATIHAN",
            finishedAt: new Date("2026-11-01T03:00:00Z"),
            totalQuestions: 5,
            correctAnswers: 4,
            allCorrect: false,
          },
          {
            sessionId: 2,
            kind: "LATIHAN",
            finishedAt: new Date("2026-11-02T03:00:00Z"),
            totalQuestions: 5,
            correctAnswers: 5,
            allCorrect: true,
          },
          {
            sessionId: 3,
            kind: "LATIHAN",
            finishedAt: new Date("2026-11-03T03:00:00Z"),
            totalQuestions: 5,
            correctAnswers: 3,
            allCorrect: false,
          },
        ],
        gradePillarsInfo: [],
      };

      const badges = evaluateBadges(context);
      expect(badges).toContain("RAJIN_BERLATIH");
      expect(badges).not.toContain("LANGKAH_PERTAMA");
    });

    it("awards TUNTAS_* only when all active assessments in pillar are opened and completed", () => {
      const context: BadgeEvaluationContext = {
        completedSessions: [
          {
            sessionId: 1,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-01T03:00:00Z"),
            assessmentId: 10,
            totalQuestions: 5,
            correctAnswers: 4,
            allCorrect: false,
            pillarCode: "KECAKAPAN",
          },
          {
            sessionId: 2,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-04T03:00:00Z"),
            assessmentId: 11,
            totalQuestions: 5,
            correctAnswers: 5,
            allCorrect: true,
            pillarCode: "KECAKAPAN",
          },
        ],
        gradePillarsInfo: [
          {
            pillarCode: "KECAKAPAN",
            totalActive: 2,
            allOpened: true,
            assessmentIds: [10, 11],
          },
          {
            pillarCode: "BUDAYA",
            totalActive: 1,
            allOpened: false, // not opened yet (scheduled)
            assessmentIds: [12],
          },
        ],
      };

      const badges = evaluateBadges(context);
      expect(badges).toContain("TUNTAS_KECAKAPAN");
      expect(badges).not.toContain("TUNTAS_BUDAYA");
    });

    it("does not re-award already earned badges", () => {
      const context: BadgeEvaluationContext = {
        completedSessions: [
          {
            sessionId: 1,
            kind: "WAJIB",
            finishedAt: new Date("2026-11-01T03:00:00Z"),
            totalQuestions: 5,
            correctAnswers: 5,
            allCorrect: true,
            pillarCode: "KECAKAPAN",
          },
        ],
        gradePillarsInfo: [],
        alreadyEarnedBadgeCodes: ["LANGKAH_PERTAMA"],
      };

      const badges = evaluateBadges(context);
      expect(badges).not.toContain("LANGKAH_PERTAMA");
      expect(badges).toContain("TELITI");
    });
  });
});
