"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

// ─── Warna pilar sesuai DESIGN.md ────────────────────────────────────────────
const PILLAR_COLORS: Record<string, string> = {
  KECAKAPAN: "#4F46E5", // indigo-600
  ETIKA: "#0D9488",     // teal-600
  KEAMANAN: "#0284C7",  // sky-600
  BUDAYA: "#7C3AED",    // violet-600
};

const PILLAR_DOT_CLASSES: Record<string, string> = {
  KECAKAPAN: "bg-indigo-600",
  ETIKA: "bg-teal-600",
  KEAMANAN: "bg-sky-600",
  BUDAYA: "bg-violet-600",
};

// ─── Grafik Skor Pilar (Flat & Interaktif: Legenda Kiri + Batang Kanan) ─────

interface PillarScore {
  pillarCode: string;
  pillarName: string;
  accuracy: number | null;
  totalAnswers?: number;
}

export function PillarChart({ scores }: { scores: PillarScore[] }) {
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const hasData = scores.some((s) => s.accuracy !== null);

  if (!scores.length || !hasData) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl bg-slate-50">
        <p className="text-sm text-slate-500">Belum ada data untuk periode ini.</p>
      </div>
    );
  }

  const data = scores.map((s) => ({
    name: s.pillarName,
    code: s.pillarCode,
    akurasi: s.accuracy !== null ? Math.round(s.accuracy * 100) : 0,
    hasValue: s.accuracy !== null,
    totalAnswers: s.totalAnswers ?? 0,
  }));

  return (
    <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
      {/* Legenda interaktif di kiri */}
      <div className="space-y-1.5 md:col-span-5">
        {scores.map((s) => {
          const pct =
            s.accuracy !== null
              ? `${Math.round(s.accuracy * 100)}%`
              : "Belum ada data";
          const dotClass = PILLAR_DOT_CLASSES[s.pillarCode] ?? "bg-indigo-600";
          const isSelected = activeCode === s.pillarCode;
          const isDimmed = activeCode !== null && !isSelected;

          return (
            <button
              key={s.pillarCode}
              type="button"
              onClick={() =>
                setActiveCode((prev) =>
                  prev === s.pillarCode ? null : s.pillarCode,
                )
              }
              onMouseEnter={() => setActiveCode(s.pillarCode)}
              onMouseLeave={() => setActiveCode(null)}
              className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isSelected
                  ? "bg-slate-100"
                  : isDimmed
                    ? "opacity-50 hover:bg-slate-50 hover:opacity-100"
                    : "hover:bg-slate-50"
              }`}
            >
              <span
                className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full transition-transform duration-150 ${dotClass} ${
                  isSelected ? "scale-110" : ""
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {s.pillarName}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {s.accuracy !== null
                    ? `Akurasi ${pct} • ${s.totalAnswers ?? 0} jawaban`
                    : "Belum ada data"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Grafik batang di kanan */}
      <div className="md:col-span-7">
        <ResponsiveContainer width="100%" height={215}>
          <BarChart
            data={data}
            margin={{ top: 14, right: 8, left: -16, bottom: 0 }}
            barSize={32}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}`}
              tick={{ fontSize: 11, fill: "#64748B" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "#F1F5F9" }}
              formatter={(value: number, _name, item) => [
                item?.payload?.hasValue ? `${value}%` : "Belum ada data",
                "Akurasi",
              ]}
              contentStyle={{
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#0F172A",
                color: "#FFFFFF",
                fontSize: "12px",
              }}
              itemStyle={{ color: "#FFFFFF" }}
              labelStyle={{ color: "#CBD5E1", fontWeight: 600 }}
            />
            <Bar dataKey="akurasi" radius={[8, 8, 0, 0]}>
              {data.map((entry) => {
                const isDimmed =
                  activeCode !== null && activeCode !== entry.code;
                return (
                  <Cell
                    key={entry.code}
                    fill={
                      entry.hasValue
                        ? (PILLAR_COLORS[entry.code] ?? "#4F46E5")
                        : "#E2E8F0"
                    }
                    fillOpacity={isDimmed ? 0.25 : 1}
                    className="cursor-pointer transition-opacity duration-150"
                    onClick={() =>
                      setActiveCode((prev) =>
                        prev === entry.code ? null : entry.code,
                      )
                    }
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Grafik Tren ─────────────────────────────────────────────────────────────

interface TrendPoint {
  assessmentId: number;
  assessmentTitle: string;
  topicName: string | null;
  opensAt: string; // ISO string (sudah diserialisasi dari Date)
  accuracy: number;
  participantCount: number;
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (!points.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl bg-slate-50">
        <p className="text-sm text-slate-500">
          Belum ada data tren untuk periode ini.
        </p>
      </div>
    );
  }

  const data = points.map((p) => ({
    name: p.topicName ?? p.assessmentTitle,
    akurasi: Math.round(p.accuracy * 100),
    peserta: p.participantCount,
    tanggal: new Date(p.opensAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
  }));

  return (
    <div className="space-y-2.5">
      <ResponsiveContainer width="100%" height={225}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#475569" }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={52}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              name === "akurasi" ? `${value}%` : value,
              name === "akurasi" ? "Akurasi" : "Peserta",
            ]}
            labelFormatter={(label) => `Materi: ${label}`}
            contentStyle={{
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#0F172A",
              color: "#FFFFFF",
              fontSize: "12px",
            }}
            itemStyle={{ color: "#FFFFFF" }}
            labelStyle={{ color: "#CBD5E1", fontWeight: 600 }}
          />
          <ReferenceLine
            y={60}
            stroke="#FB7185"
            strokeDasharray="4 4"
            label={{ value: "60%", fontSize: 10, fill: "#FB7185" }}
          />
          <ReferenceLine
            y={80}
            stroke="#34D399"
            strokeDasharray="4 4"
            label={{ value: "80%", fontSize: 10, fill: "#34D399" }}
          />
          <Line
            type="monotone"
            dataKey="akurasi"
            stroke="#4F46E5"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#4F46E5" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500">
        ⚠ Setiap titik adalah materi yang berbeda. Perbedaan skor antar titik dipengaruhi
        tingkat kesulitan materi, bukan hanya perkembangan siswa.
      </p>
    </div>
  );
}
