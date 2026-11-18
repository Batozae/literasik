"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, Home, LogOut, RotateCcw, Sparkles, Trophy } from "lucide-react";
import {
  BrandCompactLogo,
  BrandSidebarLogo,
  MobileHeaderBubbles,
  SidebarBubbles,
} from "@/components/brand-logo";
import { logoutAction } from "@/app/actions";

const links = [
  { href: "/siswa", label: "Beranda", icon: Home },
  { href: "/siswa/asesmen", label: "Asesmen", icon: BookOpen },
  { href: "/siswa/latihan", label: "Latihan", icon: Sparkles },
  { href: "/siswa/peringkat", label: "Peringkat", icon: Trophy },
  { href: "/siswa/riwayat", label: "Riwayat", icon: RotateCcw },
];

function isActive(pathname: string, href: string) {
  return href === "/siswa"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function StudentNavigation({
  name,
  classNameLabel,
  gradeLevel,
}: {
  name: string;
  classNameLabel?: string;
  gradeLevel?: number;
}) {
  const pathname = usePathname();
  const [optimisticNav, setOptimisticNav] = useState<{
    fromPath: string;
    targetHref: string;
  } | null>(null);
  const activePathname =
    optimisticNav && optimisticNav.fromPath === pathname
      ? optimisticNav.targetHref
      : pathname;
  return (
    <>
      {/* Sidebar kiri desktop: flat indigo gelap + bubble dekoratif + pil putih melengkung */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-indigo-950 text-white md:flex">
        <SidebarBubbles />

        <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-4 pb-4">
          <Link
            href="/siswa"
            onClick={() =>
              setOptimisticNav({ fromPath: pathname, targetHref: "/siswa" })
            }
            aria-label="Literasik Ruang Belajar Siswa"
            className="rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <BrandSidebarLogo />
          </Link>
        </div>

        <nav aria-label="Navigasi siswa" className="relative z-10 flex-1 space-y-2 py-2">
          {links.map((link) => {
            const active = isActive(activePathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() =>
                  setOptimisticNav({
                    fromPath: pathname,
                    targetHref: link.href,
                  })
                }
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "sidebar-active-tab relative ml-8 flex min-h-12 items-center rounded-l-full pl-8 pr-6 text-sm font-semibold text-indigo-950 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400"
                    : "ml-8 flex min-h-12 items-center rounded-l-full pl-8 pr-6 text-sm font-medium text-indigo-100/90 outline-none transition-all duration-150 hover:bg-white/10 hover:pl-8 hover:text-white active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-white/70"
                }
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 px-6 pt-4 pb-6">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            {classNameLabel ? (
              <p className="truncate text-xs text-indigo-200/80">
                Kelas {classNameLabel}
                {gradeLevel ? `: Angkatan ${gradeLevel}` : ""}
              </p>
            ) : null}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-100 px-4 text-sm font-semibold text-rose-600 outline-none transition-all duration-150 hover:bg-rose-200 hover:text-rose-700 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Header atas desktop: flat putih bersih */}
      <header className="sticky top-0 z-10 hidden bg-white shadow-lg md:ml-64 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 xl:px-8">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">
              Selamat datang, {name}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {classNameLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Award className="h-3.5 w-3.5" />
                Kelas {classNameLabel}
                {gradeLevel ? `: Angkatan ${gradeLevel}` : ""}
              </span>
            ) : null}
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Siswa
            </span>
          </div>
        </div>
      </header>

      {/* Header mobile atas */}
      <header className="relative flex items-center justify-between overflow-hidden bg-indigo-950 px-4 py-3 text-white md:hidden">
        <MobileHeaderBubbles />
        <Link href="/siswa" aria-label="Literasik Ruang Belajar Siswa" className="relative z-10">
          <BrandCompactLogo />
        </Link>

        <div className="relative z-10 mr-auto ml-3 min-w-0">
          <p className="truncate text-xs font-semibold text-white">{name}</p>
          {classNameLabel ? (
            <p className="truncate text-[11px] text-indigo-200">
              Kelas {classNameLabel}
            </p>
          ) : null}
        </div>

        <form action={logoutAction} className="relative z-10">
          <button
            type="submit"
            className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-lg bg-rose-100 px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-200 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </form>
      </header>

      {/* Bottom tab bar mobile ringkas (1 baris bersih) */}
      <nav
        aria-label="Navigasi siswa"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200/80 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 py-1">
          {links.map((link) => {
            const active = isActive(activePathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() =>
                  setOptimisticNav({
                    fromPath: pathname,
                    targetHref: link.href,
                  })
                }
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-center text-[11px] font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active
                    ? "bg-indigo-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
