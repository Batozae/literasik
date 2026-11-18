import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StudentHeaderAccent = "indigo" | "teal" | "amber" | "sky" | "violet";

const ACCENT_STYLES: Record<
  StudentHeaderAccent,
  { strip: string; iconBox: string; eyebrow: string }
> = {
  indigo: {
    strip: "bg-indigo-600",
    iconBox: "bg-indigo-600 text-white",
    eyebrow: "text-indigo-700",
  },
  teal: {
    strip: "bg-teal-500",
    iconBox: "bg-teal-500 text-white",
    eyebrow: "text-teal-700",
  },
  amber: {
    strip: "bg-amber-400",
    iconBox: "bg-amber-400 text-slate-950",
    eyebrow: "text-amber-700",
  },
  sky: {
    strip: "bg-sky-500",
    iconBox: "bg-sky-500 text-white",
    eyebrow: "text-sky-700",
  },
  violet: {
    strip: "bg-violet-500",
    iconBox: "bg-violet-500 text-white",
    eyebrow: "text-violet-700",
  },
};

/**
 * Header halaman siswa terbuka di atas kanvas terang dengan kotak ikon solid
 * serta tipografi pekat agar tetap tegas, kontras, dan terasa lapang.
 */
export function StudentPageHeader({
  title,
  description,
  eyebrow,
  icon,
  accent = "indigo",
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  icon: ReactNode;
  accent?: StudentHeaderAccent;
  action?: ReactNode;
  className?: string;
}) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-slate-200/90 pb-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
            styles.iconBox,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          {eyebrow && (
            <span
              className={cn(
                "mb-1 inline-flex rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-xs",
                styles.eyebrow,
              )}
            >
              {eyebrow}
            </span>
          )}
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-sm text-slate-700">{description}</p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Header subbagian (H2) terbuka di atas kanvas dengan garis aksen
 * berwarna di sisi kiri judul agar tetap menonjol tanpa kotak kartu penuh.
 */
export function StudentSectionHeader({
  title,
  description,
  accent = "indigo",
  right,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  accent?: StudentHeaderAccent;
  right?: ReactNode;
  className?: string;
}) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden="true"
          className={cn("mt-1 h-4 w-1 shrink-0 rounded-full", styles.strip)}
        />
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-slate-600">{description}</p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
