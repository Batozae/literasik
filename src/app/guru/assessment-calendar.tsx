"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export interface CalendarAssessmentItem {
  id: number;
  title: string;
  opensAt: string | null;
  closesAt: string | null;
  topicName: string | null;
  status: "Dijadwalkan" | "Berlangsung" | "Ditutup";
  opensAtLabel: string;
  closesAtLabel: string;
}

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function toWibYmd(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function makeYmd(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function enumerateDatesBetween(startYmd: string, endYmd: string): string[] {
  const result: string[] = [];
  const [sy, sm, sd] = startYmd.split("-").map(Number);
  const [ey, em, ed] = endYmd.split("-").map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  let guard = 0;
  while (cur <= end && guard < 60) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    result.push(`${y}-${m}-${d}`);
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard += 1;
  }
  return result;
}

export function AssessmentCalendar({
  assessments,
  initialNowIso,
}: {
  assessments: CalendarAssessmentItem[];
  initialNowIso: string;
}) {
  const todayYmd = useMemo(() => toWibYmd(initialNowIso), [initialNowIso]);
  const [todayYear, todayMonth] = useMemo(
    () => todayYmd.split("-").map(Number),
    [todayYmd],
  );

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth - 1);

  const dateAssessmentsMap = useMemo(() => {
    const map = new Map<string, CalendarAssessmentItem[]>();
    for (const a of assessments) {
      if (!a.opensAt) continue;
      const startYmd = toWibYmd(a.opensAt);
      const endYmd = a.closesAt ? toWibYmd(a.closesAt) : startYmd;
      const days = enumerateDatesBetween(startYmd, endYmd);
      for (const ymd of days) {
        const list = map.get(ymd) ?? [];
        list.push(a);
        map.set(ymd, list);
      }
    }
    return map;
  }, [assessments]);

  const defaultSelectedYmd = useMemo(() => {
    if (dateAssessmentsMap.has(todayYmd)) return todayYmd;
    const upcoming = assessments.find((a) => a.status !== "Ditutup" && a.opensAt);
    if (upcoming?.opensAt) return toWibYmd(upcoming.opensAt);
    const last = [...assessments].reverse().find((a) => a.opensAt);
    return last?.opensAt ? toWibYmd(last.opensAt) : todayYmd;
  }, [assessments, dateAssessmentsMap, todayYmd]);

  const [selectedYmd, setSelectedYmd] = useState<string>(defaultSelectedYmd);

  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const prevMonthDays = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

    const list: Array<{
      ymd: string;
      dayNumber: number;
      inCurrentMonth: boolean;
    }> = [];

    for (let i = firstWeekday - 1; i >= 0; i -= 1) {
      const d = prevMonthDays - i;
      const prevDate = new Date(Date.UTC(viewYear, viewMonth - 1, d));
      list.push({
        ymd: makeYmd(
          prevDate.getUTCFullYear(),
          prevDate.getUTCMonth(),
          prevDate.getUTCDate(),
        ),
        dayNumber: d,
        inCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d += 1) {
      list.push({
        ymd: makeYmd(viewYear, viewMonth, d),
        dayNumber: d,
        inCurrentMonth: true,
      });
    }

    const remainder = list.length % 7;
    if (remainder !== 0) {
      const needed = 7 - remainder;
      for (let d = 1; d <= needed; d += 1) {
        const nextDate = new Date(Date.UTC(viewYear, viewMonth + 1, d));
        list.push({
          ymd: makeYmd(
            nextDate.getUTCFullYear(),
            nextDate.getUTCMonth(),
            nextDate.getUTCDate(),
          ),
          dayNumber: d,
          inCurrentMonth: false,
        });
      }
    }

    return list;
  }, [viewYear, viewMonth]);

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const selectedItems = dateAssessmentsMap.get(selectedYmd) ?? [];

  return (
    <div className="space-y-4">
      {/* Header navigasi bulan */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label="Bulan sebelumnya"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 transition-all hover:bg-rose-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-sm font-semibold text-slate-900">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="Bulan berikutnya"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Nama hari */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="rounded-full bg-slate-100 py-1 text-center text-xs font-semibold text-slate-700"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid tanggal flat & interaktif */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((cell) => {
          const items = dateAssessmentsMap.get(cell.ymd) ?? [];
          const hasAssessment = items.length > 0;
          const isToday = cell.ymd === todayYmd;
          const isSelected = cell.ymd === selectedYmd;

          const primaryStatus = items.some((i) => i.status === "Berlangsung")
            ? "Berlangsung"
            : items.some((i) => i.status === "Dijadwalkan")
              ? "Dijadwalkan"
              : items.length > 0
                ? "Ditutup"
                : null;

          let pillClass = "text-slate-700 hover:bg-slate-100";
          if (!cell.inCurrentMonth) {
            pillClass = "text-slate-300 hover:bg-slate-50";
          }
          if (primaryStatus === "Ditutup") {
            pillClass =
              "bg-emerald-500 text-white font-semibold hover:bg-emerald-600";
          } else if (primaryStatus === "Berlangsung") {
            pillClass = "bg-indigo-500 text-white font-semibold hover:bg-indigo-600";
          } else if (primaryStatus === "Dijadwalkan") {
            pillClass =
              "bg-amber-500 text-white font-semibold hover:bg-amber-600";
          }

          return (
            <div key={cell.ymd} className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setSelectedYmd(cell.ymd)}
                className={cn(
                  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-xs tabular-nums transition-all duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  pillClass,
                  isToday &&
                    !hasAssessment &&
                    "bg-indigo-50 font-semibold text-indigo-700",
                  isSelected &&
                    !hasAssessment &&
                    "bg-slate-900 font-semibold text-white hover:bg-slate-800",
                  isSelected &&
                    hasAssessment &&
                    "ring-2 ring-indigo-950 ring-offset-2",
                )}
                title={
                  hasAssessment
                    ? items.map((i) => i.title).join(", ")
                    : cell.ymd
                }
              >
                {String(cell.dayNumber).padStart(2, "0")}
              </button>
            </div>
          );
        })}
      </div>

      {/* Keterangan warna + detail tanggal terpilih (flat surface) */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Selesai
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            Berlangsung
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Dijadwalkan
          </span>
        </div>

        {selectedItems.length > 0 ? (
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="text-slate-500">
                    {item.opensAtLabel} – {item.closesAtLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={
                      item.status === "Ditutup"
                        ? "Selesai"
                        : item.status === "Berlangsung"
                          ? "Berlangsung"
                          : "Dijadwalkan"
                    }
                  />
                  <Link
                    href={`/guru/asesmen/${item.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                  >
                    <span>Kelola</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>Tidak ada jadwal asesmen wajib pada tanggal terpilih.</span>
          </div>
        )}
      </div>
    </div>
  );
}
