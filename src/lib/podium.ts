export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const PODIUM_STYLES = [
  {
    // Peringkat 1: Gold
    card: "bg-linear-to-br from-[#FFD700] to-[#FFA500] text-slate-950",
    ring: "bg-white/55 text-slate-950",
    pill: "bg-amber-800 text-white",
    sub: "text-slate-900/80",
    label: "Peringkat 1",
  },
  {
    // Peringkat 2: Silver
    card: "bg-linear-to-br from-[#E0E5EC] to-[#A0AEC0] text-slate-950",
    ring: "bg-white/55 text-slate-900",
    pill: "bg-slate-700 text-white",
    sub: "text-slate-700",
    label: "Peringkat 2",
  },
  {
    // Peringkat 3: Bronze
    card: "bg-linear-to-br from-[#E69D6C] to-[#B86B35] text-slate-950",
    ring: "bg-white/45 text-slate-950",
    pill: "bg-orange-950/85 text-white",
    sub: "text-slate-900/80",
    label: "Peringkat 3",
  },
] as const;

export const RANK_BADGE_CLASSES: Record<number, string> = {
  1: "bg-linear-to-br from-[#FFD700] to-[#FFA500] text-slate-950",
  2: "bg-linear-to-br from-[#E0E5EC] to-[#A0AEC0] text-slate-900",
  3: "bg-linear-to-br from-[#E69D6C] to-[#B86B35] text-slate-950",
};

