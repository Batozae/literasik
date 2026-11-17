import {
  LEVEL_THRESHOLDS,
  POINTS_WAJIB_CORRECT,
  POINTS_WAJIB_BONUS,
  POINTS_PRACTICE_CORRECT,
  POINTS_PRACTICE_DAILY_CAP,
  LEADERBOARD_TOP_N,
} from "@/lib/config";

export {
  LEVEL_THRESHOLDS,
  POINTS_WAJIB_CORRECT,
  POINTS_WAJIB_BONUS,
  POINTS_PRACTICE_CORRECT,
  POINTS_PRACTICE_DAILY_CAP,
  LEADERBOARD_TOP_N,
};
import { getWibDate } from "@/lib/schedule";

export interface LevelInfo {
  level: number;
  totalPoints: number;
  currentLevelThreshold: number;
  nextLevelThreshold: number | null;
  pointsToNext: number;
  progressPercent: number;
}

/**
 * Menghitung level siswa berdasarkan total poin.
 * Ambang batas: [0, 60, 150, 250, 350]
 * Level 1: 0-59
 * Level 2: 60-149
 * Level 3: 150-249
 * Level 4: 250-349
 * Level 5: 350+
 */
export function calculateLevel(totalPoints: number): LevelInfo {
  const points = Math.max(0, totalPoints);
  const thresholds = LEVEL_THRESHOLDS;

  let currentLevel = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (points >= thresholds[i]) {
      currentLevel = i + 1;
      break;
    }
  }

  const currentLevelThreshold = thresholds[currentLevel - 1];
  const nextLevelThreshold =
    currentLevel < thresholds.length ? thresholds[currentLevel] : null;

  let pointsToNext = 0;
  let progressPercent = 100;

  if (nextLevelThreshold !== null) {
    pointsToNext = Math.max(0, nextLevelThreshold - points);
    const range = nextLevelThreshold - currentLevelThreshold;
    const earnedInRange = points - currentLevelThreshold;
    progressPercent = Math.min(100, Math.max(0, Math.round((earnedInRange / range) * 100)));
  }

  return {
    level: currentLevel,
    totalPoints: points,
    currentLevelThreshold,
    nextLevelThreshold,
    pointsToNext,
    progressPercent,
  };
}

/**
 * Menghitung perolehan poin untuk sesi WAJIB:
 * - 10 poin per jawaban benar
 * - Bonus 20 jika semua soal dijawab dan diselesaikan sebelum closesAt
 */
export function calculateWajibPoints(
  correctCount: number,
  isEligibleForBonus: boolean,
): { answerPoints: number; bonusPoints: number; totalEarned: number } {
  const answerPoints = Math.max(0, correctCount) * POINTS_WAJIB_CORRECT;
  const bonusPoints = isEligibleForBonus ? POINTS_WAJIB_BONUS : 0;
  return {
    answerPoints,
    bonusPoints,
    totalEarned: answerPoints + bonusPoints,
  };
}

/**
 * Menghitung poin perolehan untuk satu jawaban LATIHAN:
 * - 2 poin jika benar
 * - Maksimal 20 poin per hari (WIB)
 */
export function calculatePracticePointsForAnswer(
  todayPracticePoints: number,
  isCorrect: boolean,
): number {
  if (!isCorrect) return 0;
  const remainingAllowance = Math.max(
    0,
    POINTS_PRACTICE_DAILY_CAP - Math.max(0, todayPracticePoints),
  );
  return Math.min(POINTS_PRACTICE_CORRECT, remainingAllowance);
}

/**
 * Format nama pada papan peringkat: "Nama Depan + inisial belakang (kelas)"
 * Contoh: "Aditya Pratama" + "7A" -> "Aditya P. (7A)"
 *         "Siti" + "7B" -> "Siti (7B)"
 */
export function formatLeaderboardName(fullName: string, className: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return `(${className})`;

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0]} (${className})`;
  }

  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return `${firstName} ${lastInitial}. (${className})`;
}

export interface LeaderboardCandidate {
  studentId: number;
  name: string;
  className: string;
  wajibPoints: number;
  wajibAccuracy: number; // 0..1
}

export interface RankedLeaderboardEntry extends LeaderboardCandidate {
  rank: number;
  formattedName: string;
}

/**
 * Mengurutkan dan memeringkat kandidat papan peringkat angkatan:
 * 1. Poin peringkat (wajib) menurun
 * 2. Akurasi wajib menurun
 * 3. Nama menaik (alfabetis)
 * Catatan: Siswa tanpa poin WAJIB (wajibPoints <= 0) tidak diperingkat (D-07).
 */
export function sortAndRankLeaderboard<T extends LeaderboardCandidate>(
  candidates: T[],
): Array<T & { rank: number; formattedName: string }> {
  // Hanya siswa dengan poin WAJIB > 0
  const eligible = candidates.filter((c) => c.wajibPoints > 0);

  eligible.sort((a, b) => {
    if (b.wajibPoints !== a.wajibPoints) {
      return b.wajibPoints - a.wajibPoints;
    }
    if (b.wajibAccuracy !== a.wajibAccuracy) {
      return b.wajibAccuracy - a.wajibAccuracy;
    }
    return a.name.localeCompare(b.name, "id");
  });

  return eligible.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    formattedName: formatLeaderboardName(entry.name, entry.className),
  }));
}

export interface CompletedSessionSummary {
  sessionId: number;
  kind: "WAJIB" | "LATIHAN";
  finishedAt: Date;
  assessmentId?: number | null;
  totalQuestions: number;
  correctAnswers: number;
  allCorrect: boolean;
  pillarCode?: string | null; // e.g. "KECAKAPAN", "ETIKA", "KEAMANAN", "BUDAYA"
}

export interface PillarAssessmentInfo {
  pillarCode: string;
  totalActive: number;
  allOpened: boolean; // semua aktif sudah opensAt <= now
  assessmentIds: number[];
}

export interface BadgeEvaluationContext {
  completedSessions: CompletedSessionSummary[];
  gradePillarsInfo: PillarAssessmentInfo[];
  alreadyEarnedBadgeCodes?: Iterable<string>;
}

/**
 * Mengevaluasi 9 lencana literasi digital (D-06):
 * 1. LANGKAH_PERTAMA: 1 sesi WAJIB selesai
 * 2. TELITI: semua benar di satu asesmen WAJIB (totalQuestions > 0 && correctAnswers === totalQuestions)
 * 3. KONSISTEN: sesi pada 3 tanggal berbeda (WIB)
 * 4. PENJELAJAH: WAJIB dari keempat pilar (KECAKAPAN, ETIKA, KEAMANAN, BUDAYA)
 * 5. RAJIN_BERLATIH: 3 sesi LATIHAN selesai
 * 6..9. TUNTAS_*: semua asesmen WAJIB aktif pilar itu milik angkatannya selesai,
 *      hanya dievaluasi jika jumlahnya >= 1 dan semuanya sudah dibuka.
 */
export function evaluateBadges(context: BadgeEvaluationContext): string[] {
  const earned = new Set<string>(context.alreadyEarnedBadgeCodes ?? []);
  const newlyEarned: string[] = [];

  const wajibSessions = context.completedSessions.filter((s) => s.kind === "WAJIB");
  const practiceSessions = context.completedSessions.filter((s) => s.kind === "LATIHAN");

  // 1. LANGKAH_PERTAMA
  if (!earned.has("LANGKAH_PERTAMA") && wajibSessions.length >= 1) {
    newlyEarned.push("LANGKAH_PERTAMA");
    earned.add("LANGKAH_PERTAMA");
  }

  // 2. TELITI
  if (
    !earned.has("TELITI") &&
    wajibSessions.some((s) => s.totalQuestions > 0 && s.allCorrect)
  ) {
    newlyEarned.push("TELITI");
    earned.add("TELITI");
  }

  // 3. KONSISTEN (sesi pada 3 tanggal berbeda WIB)
  if (!earned.has("KONSISTEN")) {
    const dates = new Set(
      context.completedSessions.map((s) => getWibDate(s.finishedAt)),
    );
    if (dates.size >= 3) {
      newlyEarned.push("KONSISTEN");
      earned.add("KONSISTEN");
    }
  }

  // 4. PENJELAJAH (WAJIB dari keempat pilar)
  if (!earned.has("PENJELAJAH")) {
    const pillars = new Set(
      wajibSessions
        .map((s) => s.pillarCode)
        .filter((code): code is string => typeof code === "string" && code.length > 0),
    );
    const requiredPillars = ["KECAKAPAN", "ETIKA", "KEAMANAN", "BUDAYA"];
    if (requiredPillars.every((p) => pillars.has(p))) {
      newlyEarned.push("PENJELAJAH");
      earned.add("PENJELAJAH");
    }
  }

  // 5. RAJIN_BERLATIH (3 sesi LATIHAN)
  if (!earned.has("RAJIN_BERLATIH") && practiceSessions.length >= 3) {
    newlyEarned.push("RAJIN_BERLATIH");
    earned.add("RAJIN_BERLATIH");
  }

  // 6..9. TUNTAS_KECAKAPAN, TUNTAS_ETIKA, TUNTAS_KEAMANAN, TUNTAS_BUDAYA
  const completedWajibAssessmentIds = new Set(
    wajibSessions
      .map((s) => s.assessmentId)
      .filter((id): id is number => typeof id === "number"),
  );

  for (const pillarInfo of context.gradePillarsInfo) {
    const badgeCode = `TUNTAS_${pillarInfo.pillarCode.toUpperCase()}`;
    if (earned.has(badgeCode)) continue;

    // Hanya dievaluasi jika jumlahnya >= 1 dan semuanya sudah dibuka
    if (pillarInfo.totalActive >= 1 && pillarInfo.allOpened) {
      const allCompleted = pillarInfo.assessmentIds.every((id) =>
        completedWajibAssessmentIds.has(id),
      );
      if (allCompleted) {
        newlyEarned.push(badgeCode);
        earned.add(badgeCode);
      }
    }
  }

  return newlyEarned;
}
