"use client";

import {
  BarChart,
  Bar,
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
  KEAMANAN: "#0EA5E9",  // sky-500 (sky-600 adalah #0284C7, pakai sky-500 agar kontras)
  BUDAYA: "#7C3AED",    // violet-600
};

// ─── Grafik Skor Pilar ───────────────────────────────────────────────────────

interface PillarScore {
  pillarCode: string;
  pillarName: string;
  accuracy: number | null;
}

export function PillarChart({ scores }: { scores: PillarScore[] }) {
  const hasData = scores.some((s) => s.accuracy !== null);

  if (!scores.length || !hasData) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <p className="text-sm text-slate-500">Belum ada data untuk periode ini.</p>
      </div>
    );
  }

  const data = scores.map((s) => ({
    name: s.pillarName,
    code: s.pillarCode,
    akurasi: s.accuracy !== null ? Math.round(s.accuracy * 100) : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: "#64748B" }}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Akurasi"]}
          contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
        />
        <Bar
          dataKey="akurasi"
          radius={[4, 4, 0, 0]}
          fill="#4F46E5"
          label={{
            position: "top",
            formatter: (val: unknown) =>
              val !== null && val !== undefined ? `${val}%` : "",
            fontSize: 11,
            fill: "#475569",
          }}
        />
      </BarChart>
    </ResponsiveContainer>
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
      <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <p className="text-sm text-slate-500">Belum ada data tren untuk periode ini.</p>
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
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#475569" }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={45}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "#64748B" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              name === "akurasi" ? `${value}%` : value,
              name === "akurasi" ? "Akurasi" : "Peserta",
            ]}
            labelFormatter={(label) => `Materi: ${label}`}
            contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
          />
          <ReferenceLine y={60} stroke="#FB7185" strokeDasharray="4 4" label={{ value: "60%", fontSize: 10, fill: "#FB7185" }} />
          <ReferenceLine y={80} stroke="#34D399" strokeDasharray="4 4" label={{ value: "80%", fontSize: 10, fill: "#34D399" }} />
          <Line
            type="monotone"
            dataKey="akurasi"
            stroke="#4F46E5"
            strokeWidth={2}
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
