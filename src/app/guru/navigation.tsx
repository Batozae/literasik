"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  BrandCompactLogo,
  BrandSidebarLogo,
  MobileHeaderBubbles,
  SidebarBubbles,
} from "@/components/brand-logo";
import { logoutAction } from "@/app/actions";

const links = [
  { href: "/guru", label: "Dasbor" },
  { href: "/guru/soal", label: "Bank Soal" },
  { href: "/guru/asesmen", label: "Asesmen" },
  { href: "/guru/peringkat", label: "Peringkat" },
];

function isActive(pathname: string, href: string) {
  return href === "/guru"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function TeacherNavigation({
  name,
  classNames = [],
}: {
  name: string;
  classNames?: string[];
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
      {/* Sidebar kiri tetap desktop: flat indigo gelap + bubble dekoratif + pil putih melengkung */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-indigo-950 text-white md:flex">
        <SidebarBubbles />

        <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-4 pb-4">
          <Link
            href="/guru"
            onClick={() =>
              setOptimisticNav({ fromPath: pathname, targetHref: "/guru" })
            }
            aria-label="Literasik Dasbor Guru"
            className="rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <BrandSidebarLogo />
          </Link>
        </div>

        <nav aria-label="Navigasi guru" className="relative z-10 flex-1 space-y-2 py-2">
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
                    ? "sidebar-active-tab relative ml-8 flex min-h-12 items-center rounded-l-full bg-slate-100 pl-8 pr-6 text-sm font-semibold text-indigo-950 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400"
                    : "ml-8 flex min-h-12 items-center rounded-l-full pl-8 pr-6 text-sm font-medium text-indigo-100/90 outline-none transition-all duration-150 hover:bg-white/10 hover:pl-8 hover:text-white active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-white/70"
                }
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 px-6 pb-6 pt-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            {classNames.length > 0 && (
              <p className="truncate text-xs text-indigo-200/80">
                Kelas {classNames.join(", ")}
              </p>
            )}
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

      {/* Header atas desktop */}
      <header className="sticky top-0 z-10 hidden bg-white shadow-lg md:ml-64 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-8 py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">
              Selamat datang, {name}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {classNames.length > 0 && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Kelas {classNames.join(": ")}
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Guru
            </span>
          </div>
        </div>
      </header>

      {/* Header & navigasi mobile */}
      <header className="relative flex items-center justify-between overflow-hidden bg-indigo-950 px-4 py-3 text-white md:hidden">
        <MobileHeaderBubbles />
        <Link href="/guru" aria-label="Literasik Dasbor Guru" className="relative z-10">
          <BrandCompactLogo />
        </Link>
        <span className="relative z-10 mr-auto ml-3 truncate text-xs text-indigo-200">
          {name}
        </span>
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

      <nav
        aria-label="Navigasi guru"
        className="grid grid-cols-4 bg-white shadow-lg md:hidden"
      >
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
              className={`flex min-h-11 items-center justify-center px-1 text-center text-xs font-medium transition-colors ${
                active
                  ? "border-b-2 border-indigo-900 font-semibold text-indigo-950"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
