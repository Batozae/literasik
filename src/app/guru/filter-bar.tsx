"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FilterBarProps {
  classOptions: { id: number; name: string }[];
  selectedClassId: string;
  selectedPeriod: string;
  customFrom: string;
  customTo: string;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "7 Hari Terakhir" },
  { value: "30", label: "30 Hari Terakhir" },
  { value: "all", label: "Semua Waktu" },
  { value: "custom", label: "Rentang Kustom" },
];

export function FilterBar({
  classOptions,
  selectedClassId,
  selectedPeriod,
  customFrom,
  customTo,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all_classes") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // Reset custom dates jika ganti period bukan custom
    if (key === "period" && value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const isCustom = selectedPeriod === "custom";

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Filter kelas */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
          Kelas
        </Label>
        <Select
          value={selectedClassId || "all_classes"}
          onValueChange={(v) => updateParam("classId", v)}
          disabled={isPending}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua kelas saya" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_classes">Semua kelas saya</SelectItem>
            {classOptions.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter periode */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
          Periode
        </Label>
        <Select
          value={selectedPeriod || "all"}
          onValueChange={(v) => updateParam("period", v)}
          disabled={isPending}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Waktu" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rentang kustom */}
      {isCustom && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Dari
            </Label>
            <Input
              type="date"
              defaultValue={customFrom}
              className="w-40"
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("from", e.target.value);
                startTransition(() => router.push(`${pathname}?${params.toString()}`));
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Sampai
            </Label>
            <Input
              type="date"
              defaultValue={customTo}
              className="w-40"
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("to", e.target.value);
                startTransition(() => router.push(`${pathname}?${params.toString()}`));
              }}
            />
          </div>
        </>
      )}

      {isPending && (
        <span className="text-sm text-slate-500 self-end pb-2">Memuat...</span>
      )}
    </div>
  );
}
