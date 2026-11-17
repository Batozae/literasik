import Image from "next/image";
import { cn } from "@/lib/utils";

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
      <div className="h-28 w-28 overflow-hidden rounded-2xl">
        <Image
          src="/literasik-owl.jpg"
          alt="Maskot Burung Hantu Literasik"
          width={128}
          height={128}
          priority
          className="h-full w-full scale-125 object-cover"
        />
      </div>
      <BrandWordmark darkBg className="mt-1.5 text-2xl" />
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
      <div className="h-11 w-11 overflow-hidden rounded-xl">
        <Image
          src="/literasik-owl.jpg"
          alt="Maskot Burung Hantu Literasik"
          width={48}
          height={48}
          className="h-full w-full scale-125 object-cover"
        />
      </div>
      <BrandWordmark darkBg className="text-lg" />
    </div>
  );
}
