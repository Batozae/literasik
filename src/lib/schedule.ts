import { TIMEZONE } from "@/lib/config";

export type AssessmentStatus = "Dijadwalkan" | "Berlangsung" | "Ditutup";

export function getAssessmentStatus(
  opensAt: Date,
  closesAt: Date,
  now: Date,
): AssessmentStatus {
  if (now < opensAt) return "Dijadwalkan";
  if (now < closesAt) return "Berlangsung";
  return "Ditutup";
}

export function canStartSession(
  opensAt: Date,
  closesAt: Date,
  now: Date,
  alreadyHasSession = false,
): boolean {
  return !alreadyHasSession && now >= opensAt && now < closesAt;
}

export function canEditComposition(opensAt: Date, now: Date): boolean {
  return now < opensAt;
}

export function canOpenNow(
  opensAt: Date,
  closesAt: Date,
  now: Date,
): boolean {
  return getAssessmentStatus(opensAt, closesAt, now) === "Dijadwalkan";
}

export function canCloseNow(
  opensAt: Date,
  closesAt: Date,
  now: Date,
): boolean {
  return getAssessmentStatus(opensAt, closesAt, now) === "Berlangsung";
}

/** Menghasilkan tanggal kalender YYYY-MM-DD pada zona waktu WIB. */
export function getWibDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Format tanggal Indonesia: "15 Nov 2026, 09.00 WIB" */
export function formatWibDateTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }
  return `${partMap.day} ${partMap.month} ${partMap.year}, ${partMap.hour}.${partMap.minute} WIB`;
}
