import { TIMEZONE } from "@/lib/config";
import { canEditComposition } from "@/lib/schedule";

export interface WajibWindowSummary {
  isActive: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
}

/**
 * D-04: Soal materi baru terbuka untuk LATIHAN setelah jendela WAJIB
 * materi itu tertutup untuk angkatan siswa.
 * - Harus ada minimal 1 asesmen WAJIB aktif pada materi tersebut yang sudah lewat closesAt.
 * - Tidak boleh ada asesmen WAJIB aktif pada materi tersebut yang masih Dijadwalkan atau Berlangsung.
 */
export function isTopicUnlockedForPractice(
  wajibAssessments: WajibWindowSummary[],
  now: Date,
): boolean {
  const activeWajib = wajibAssessments.filter((a) => a.isActive);
  if (activeWajib.length === 0) return false;

  const hasUnclosedWindow = activeWajib.some(
    (a) => !a.closesAt || now < a.closesAt,
  );
  if (hasUnclosedWindow) return false;

  return activeWajib.some((a) => a.closesAt !== null && now >= a.closesAt);
}

/**
 * Mengubah nilai input datetime-local ("YYYY-MM-DDTHH:mm") dalam zona waktu WIB (+07:00)
 * menjadi objek Date (UTC).
 */
export function parseWibDateTimeInput(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Memformat objek Date menjadi string "YYYY-MM-DDTHH:mm" pada zona waktu WIB
 * untuk nilai default <input type="datetime-local">.
 */
export function formatWibDateTimeLocalInput(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
}

/**
 * D-14: Komposisi soal dan jendela waktu asesmen WAJIB hanya bisa diubah sebelum opensAt.
 * Untuk LATIHAN: komposisi soal dapat diubah selama belum ada sesi pengerjaan siswa.
 */
export function isAssessmentCompositionLocked(params: {
  type: "WAJIB" | "LATIHAN";
  opensAt: Date | null;
  now: Date;
  hasSessions: boolean;
}): boolean {
  if (params.hasSessions) return true;
  if (params.type === "WAJIB" && params.opensAt) {
    return !canEditComposition(params.opensAt, params.now);
  }
  return false;
}

export interface AssessmentValidationInput {
  title: unknown;
  type: unknown;
  questionIds: number[];
  opensAt?: Date | null;
  closesAt?: Date | null;
  targetClassIds?: number[];
  usedInOtherWajibQuestionIds?: Set<number>;
  lockedPracticeTopicNames?: string[];
}

export function validateAssessmentInput(input: AssessmentValidationInput): string[] {
  const errors: string[] = [];

  if (typeof input.title !== "string" || !input.title.trim()) {
    errors.push("Judul asesmen wajib diisi.");
  } else if (input.title.trim().length > 191) {
    errors.push("Judul asesmen maksimal 191 karakter.");
  }

  if (input.type !== "WAJIB" && input.type !== "LATIHAN") {
    errors.push("Pilih jenis asesmen yang valid.");
    return errors;
  }

  const uniqueQuestionIds = [...new Set(input.questionIds)];
  if (uniqueQuestionIds.length === 0) {
    errors.push("Pilih minimal 1 soal untuk asesmen ini.");
  }

  if (input.type === "WAJIB") {
    if (!input.opensAt || !input.closesAt) {
      errors.push("Waktu buka dan waktu tutup wajib diisi untuk asesmen wajib.");
    } else if (input.closesAt <= input.opensAt) {
      errors.push("Waktu tutup harus lebih akhir daripada waktu buka.");
    }

    if (input.usedInOtherWajibQuestionIds) {
      const conflicts = uniqueQuestionIds.filter((id) =>
        input.usedInOtherWajibQuestionIds!.has(id),
      );
      if (conflicts.length > 0) {
        errors.push(
          "Terdapat soal yang sudah dipakai pada asesmen wajib lain (D-04: soal hanya dipakai satu asesmen wajib).",
        );
      }
    }
  }

  if (input.type === "LATIHAN") {
    if (!input.targetClassIds || input.targetClassIds.length === 0) {
      errors.push("Pilih minimal 1 kelas sasaran untuk latihan rekomendasi.");
    }

    if (
      input.lockedPracticeTopicNames &&
      input.lockedPracticeTopicNames.length > 0
    ) {
      const names = [...new Set(input.lockedPracticeTopicNames)].join(", ");
      errors.push(
        `Soal dari materi "${names}" belum dapat dipakai latihan karena jendela asesmen wajibnya belum tertutup (D-04).`,
      );
    }
  }

  return errors;
}

