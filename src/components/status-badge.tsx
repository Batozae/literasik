import {
  CheckCircle2,
  Eye,
  AlertCircle,
  Play,
  Clock,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType =
  | "Aman"
  | "Mudah"
  | "Selesai"
  | "Pantau"
  | "Sedang"
  | "Perlu Pendampingan"
  | "Sulit"
  | "Terlewat"
  | "Berlangsung"
  | "Dijadwalkan"
  | "Belum Cukup Data"
  | "Data belum cukup";

interface StatusConfig {
  variantClass: string;
  icon: LucideIcon;
}

const STATUS_CONFIGS: Record<StatusType, StatusConfig> = {
  Aman: {
    variantClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  Mudah: {
    variantClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  Selesai: {
    variantClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  Pantau: {
    variantClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Eye,
  },
  Sedang: {
    variantClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Eye,
  },
  "Perlu Pendampingan": {
    variantClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertCircle,
  },
  Sulit: {
    variantClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertCircle,
  },
  Terlewat: {
    variantClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertCircle,
  },
  Berlangsung: {
    variantClass: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Play,
  },
  Dijadwalkan: {
    variantClass: "bg-slate-50 text-slate-700 border-slate-200",
    icon: Clock,
  },
  "Belum Cukup Data": {
    variantClass: "bg-slate-50 text-slate-700 border-slate-200",
    icon: Minus,
  },
  "Data belum cukup": {
    variantClass: "bg-slate-50 text-slate-700 border-slate-200",
    icon: Minus,
  },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusType;
  label?: string;
  className?: string;
}) {
  const config = STATUS_CONFIGS[status] ?? {
    variantClass: "bg-slate-50 text-slate-700 border-slate-200",
    icon: Minus,
  };
  const Icon = config.icon;
  const displayText = label ?? status;

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
        config.variantClass,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{displayText}</span>
    </span>
  );
}
