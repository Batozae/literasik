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

  const classItems = [
    { value: "all_classes", label: "Semua kelas saya" },
    ...classOptions.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all_classes") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
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
    <div className="flex flex-wrap items-end gap-3">
      {/* Filter kelas */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Kelas
        </Label>
        <Select
          items={classItems}
          value={selectedClassId || "all_classes"}
          onValueChange={(v) => updateParam("classId", v)}
          disabled={isPending}
        >
          <SelectTrigger className="h-10 w-48 rounded-xl border-0 bg-slate-100 px-4 font-medium text-slate-800 transition-colors hover:bg-slate-200/70">
            <SelectValue placeholder="Semua kelas saya" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {classItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter periode */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Periode
        </Label>
        <Select
          items={PERIOD_OPTIONS}
          value={selectedPeriod || "all"}
          onValueChange={(v) => updateParam("period", v)}
          disabled={isPending}
        >
          <SelectTrigger className="h-10 w-48 rounded-xl border-0 bg-slate-100 px-4 font-medium text-slate-800 transition-colors hover:bg-slate-200/70">
            <SelectValue placeholder="Semua Waktu" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
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
            <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Dari
            </Label>
            <Input
              type="date"
              defaultValue={customFrom}
              className="h-10 w-40 rounded-xl border-0 bg-slate-100 px-3.5"
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("from", e.target.value);
                startTransition(() => router.push(`${pathname}?${params.toString()}`));
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Sampai
            </Label>
            <Input
              type="date"
              defaultValue={customTo}
              className="h-10 w-40 rounded-xl border-0 bg-slate-100 px-3.5"
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
        <span className="self-end pb-2 text-xs font-medium text-indigo-700">
          Memuat...
        </span>
      )}
    </div>
  );
}
