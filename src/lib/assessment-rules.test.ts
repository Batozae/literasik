import { describe, expect, it } from "vitest";
import {
  formatWibDateTimeLocalInput,
  isAssessmentCompositionLocked,
  isTopicUnlockedForPractice,
  parseWibDateTimeInput,
  validateAssessmentInput,
} from "./assessment-rules";

describe("assessment-rules (Fase 4)", () => {
  const now = new Date("2026-11-18T02:00:00Z"); // 09:00 WIB

  describe("isTopicUnlockedForPractice (D-04)", () => {
    it("mengembalikan false bila belum ada asesmen WAJIB aktif untuk materi", () => {
      expect(isTopicUnlockedForPractice([], now)).toBe(false);
      expect(
        isTopicUnlockedForPractice(
          [
            {
              isActive: false,
              opensAt: new Date("2026-11-10T01:00:00Z"),
              closesAt: new Date("2026-11-10T04:00:00Z"),
            },
          ],
          now,
        ),
      ).toBe(false);
    });

    it("mengembalikan false bila asesmen WAJIB masih Dijadwalkan atau Berlangsung", () => {
      // Dijadwalkan
      expect(
        isTopicUnlockedForPractice(
          [
            {
              isActive: true,
              opensAt: new Date("2026-11-19T01:00:00Z"),
              closesAt: new Date("2026-11-19T04:00:00Z"),
            },
          ],
          now,
        ),
      ).toBe(false);

      // Berlangsung
      expect(
        isTopicUnlockedForPractice(
          [
            {
              isActive: true,
              opensAt: new Date("2026-11-18T01:00:00Z"),
              closesAt: new Date("2026-11-18T05:00:00Z"),
            },
          ],
          now,
        ),
      ).toBe(false);
    });

    it("mengembalikan true bila jendela asesmen WAJIB materi sudah tertutup", () => {
      expect(
        isTopicUnlockedForPractice(
          [
            {
              isActive: true,
              opensAt: new Date("2026-11-15T01:00:00Z"),
              closesAt: new Date("2026-11-15T04:00:00Z"),
            },
          ],
          now,
        ),
      ).toBe(true);
    });
  });

  describe("parseWibDateTimeInput & formatWibDateTimeLocalInput", () => {
    it("mengonversi string datetime-local WIB ke Date UTC dan sebaliknya", () => {
      const parsed = parseWibDateTimeInput("2026-11-18T09:30");
      expect(parsed).not.toBeNull();
      expect(parsed!.toISOString()).toBe("2026-11-18T02:30:00.000Z");
      expect(formatWibDateTimeLocalInput(parsed)).toBe("2026-11-18T09:30");
    });

    it("mengembalikan null untuk format tanggal yang tidak valid", () => {
      expect(parseWibDateTimeInput("")).toBeNull();
      expect(parseWibDateTimeInput("bukan-tanggal")).toBeNull();
    });
  });

  describe("isAssessmentCompositionLocked (D-14)", () => {
    it("mengunci asesmen WAJIB setelah opensAt lewat atau bila sudah ada sesi", () => {
      expect(
        isAssessmentCompositionLocked({
          type: "WAJIB",
          opensAt: new Date("2026-11-19T01:00:00Z"),
          now,
          hasSessions: false,
        }),
      ).toBe(false);

      expect(
        isAssessmentCompositionLocked({
          type: "WAJIB",
          opensAt: new Date("2026-11-18T01:00:00Z"),
          now,
          hasSessions: false,
        }),
      ).toBe(true);
    });

    it("mengizinkan ubah komposisi LATIHAN selama belum ada sesi pengerjaan", () => {
      expect(
        isAssessmentCompositionLocked({
          type: "LATIHAN",
          opensAt: null,
          now,
          hasSessions: false,
        }),
      ).toBe(false);

      expect(
        isAssessmentCompositionLocked({
          type: "LATIHAN",
          opensAt: null,
          now,
          hasSessions: true,
        }),
      ).toBe(true);
    });
  });

  describe("validateAssessmentInput", () => {
    it("menolak asesmen WAJIB dengan soal duplikat di asesmen WAJIB lain atau jendela tidak valid", () => {
      const errors = validateAssessmentInput({
        title: "Asesmen Wajib Baru",
        type: "WAJIB",
        questionIds: [1, 2],
        opensAt: new Date("2026-11-20T04:00:00Z"),
        closesAt: new Date("2026-11-20T02:00:00Z"),
        usedInOtherWajibQuestionIds: new Set([2]),
      });
      expect(errors).toContain(
        "Waktu tutup harus lebih akhir daripada waktu buka.",
      );
      expect(
        errors.some((e) => e.includes("sudah dipakai pada asesmen wajib lain")),
      ).toBe(true);
    });

    it("menolak asesmen LATIHAN bila materi belum terbuka atau tanpa kelas sasaran", () => {
      const errors = validateAssessmentInput({
        title: "Latihan Rekomendasi",
        type: "LATIHAN",
        questionIds: [10],
        targetClassIds: [],
        lockedPracticeTopicNames: ["Jejak digital dan reputasi"],
      });
      expect(errors).toContain(
        "Pilih minimal 1 kelas sasaran untuk latihan rekomendasi.",
      );
      expect(
        errors.some((e) => e.includes("Jejak digital dan reputasi")),
      ).toBe(true);
    });
  });
});

