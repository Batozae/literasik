export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const PODIUM_STYLES = [
  {
    // Peringkat 1: Gold
    card: "bg-amber-400 text-slate-950 hover:bg-amber-500",
    ring: "bg-white/45 text-slate-950",
    pill: "bg-amber-700 text-white",
    sub: "text-slate-900/80",
    label: "Peringkat 1",
  },
  {
    // Peringkat 2: Silver
    card: "bg-slate-300 text-slate-950 hover:bg-slate-400/80",
    ring: "bg-white/55 text-slate-900",
    pill: "bg-slate-600 text-white",
    sub: "text-slate-700",
    label: "Peringkat 2",
  },
  {
    // Peringkat 3: Bronze
    card: "bg-orange-700 text-white hover:bg-orange-800",
    ring: "bg-white/20 text-white",
    pill: "bg-orange-900/85 text-white",
    sub: "text-orange-100",
    label: "Peringkat 3",
  },
] as const;

export const RANK_BADGE_CLASSES: Record<number, string> = {
  1: "bg-amber-400 text-slate-950",
  2: "bg-slate-300 text-slate-900",
  3: "bg-orange-700 text-white",
};

