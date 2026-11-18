import { cn } from "@/lib/utils";
import { LiterasikOwl } from "@/components/literasik-owl";

export function BrandWordmark({
  darkBg = true,
  className,
}: {
  darkBg?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-extrabold tracking-tight leading-none select-none",
        className,
      )}
    >
      <span className={darkBg ? "text-white" : "text-indigo-950"}>Litera</span>
      <span className={darkBg ? "text-teal-300" : "text-teal-600"}>sik</span>
      <span className={darkBg ? "text-amber-400" : "text-amber-500"}>.</span>
    </span>
  );
}

export function BrandSidebarLogo() {
  return (
    <div className="flex flex-col items-center text-center">
      <LiterasikOwl size="xl" interactive />
      <BrandWordmark darkBg className="mt-1 text-2xl" />
      <span className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.22em] text-indigo-200/80 uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Literasi Digital
      </span>
    </div>
  );
}

export function BrandCompactLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <LiterasikOwl size="sm" interactive />
      <BrandWordmark darkBg className="text-lg" />
    </div>
  );
}

export function SidebarBubbles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="absolute -top-14 -right-14 h-44 w-44 rounded-full bg-indigo-800/35" />
      <span className="absolute top-1/2 -left-10 h-32 w-32 rounded-full bg-indigo-800/20" />
      <span className="absolute -bottom-16 -left-14 h-48 w-48 rounded-full bg-teal-500/10" />
    </div>
  );
}

export function MobileHeaderBubbles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <span className="absolute -top-10 -right-8 h-24 w-24 rounded-full bg-indigo-800/35" />
      <span className="absolute -bottom-10 left-10 h-20 w-20 rounded-full bg-teal-500/10" />
    </div>
  );
}
