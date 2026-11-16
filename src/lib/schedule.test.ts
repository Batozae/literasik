import { describe, expect, it } from "vitest";
import {
  canEditComposition,
  canStartSession,
  getAssessmentStatus,
  getWibDate,
} from "@/lib/schedule";

describe("schedule", () => {
  const opensAt = new Date("2026-11-15T02:00:00.000Z");
  const closesAt = new Date("2026-11-15T04:00:00.000Z");

  it("menentukan status tepat pada batas buka dan tutup", () => {
    expect(getAssessmentStatus(opensAt, closesAt, opensAt)).toBe("Berlangsung");
    expect(getAssessmentStatus(opensAt, closesAt, closesAt)).toBe("Ditutup");
  });

  it("hanya memulai sesi di dalam jendela dan tanpa sesi sebelumnya", () => {
    expect(canStartSession(opensAt, closesAt, new Date(opensAt.getTime() - 1))).toBe(false);
    expect(canStartSession(opensAt, closesAt, opensAt)).toBe(true);
    expect(canStartSession(opensAt, closesAt, closesAt)).toBe(false);
    expect(canStartSession(opensAt, closesAt, opensAt, true)).toBe(false);
  });

  it("mengunci komposisi setelah asesmen dibuka", () => {
    expect(canEditComposition(opensAt, new Date(opensAt.getTime() - 1))).toBe(true);
    expect(canEditComposition(opensAt, new Date(opensAt.getTime() + 1))).toBe(false);
  });

  it("menggunakan tanggal WIB untuk pergantian hari", () => {
    expect(getWibDate(new Date("2026-11-15T23:30:00.000Z"))).toBe("2026-11-16");
  });
});
