"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogOut, Search, X } from "lucide-react";
import { BrandCompactLogo, BrandSidebarLogo } from "@/components/brand-logo";
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

function DashboardSearchForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(
      pathname === "/guru" ? searchParams.toString() : "",
    );
    const trimmed = query.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.push(qs ? `/guru?${qs}` : "/guru");
  }

  function handleClear() {
    setQuery("");
    if (pathname === "/guru") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      const qs = params.toString();
      router.push(qs ? `/guru?${qs}` : "/guru");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex w-full max-w-md items-center overflow-hidden rounded-xl bg-slate-100 transition-colors focus-within:bg-slate-200/70 focus-within:ring-2 focus-within:ring-indigo-500"
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari siswa atau materi..."
        aria-label="Cari siswa atau materi"
        className="min-h-10 w-full bg-transparent px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Hapus pencarian"
          className="flex h-10 w-8 shrink-0 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="submit"
        aria-label="Cari"
        className="flex h-10 w-11 shrink-0 cursor-pointer items-center justify-center bg-indigo-900 text-white transition-all hover:bg-indigo-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

export function TeacherNavigation({
  name,
  classNames = [],
}: {
  name: string;
  classNames?: string[];
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar kiri tetap desktop: flat indigo gelap + pil putih melengkung menempel kanan */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-indigo-950 text-white md:flex">
        <div className="flex flex-col items-center justify-center px-6 pt-4 pb-4">
          <Link
            href="/guru"
            aria-label="Literasik Dasbor Guru"
            className="rounded-xl p-1 transition-transform duration-150 hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <BrandSidebarLogo />
          </Link>
        </div>

        <nav aria-label="Navigasi guru" className="flex-1 space-y-2 py-2">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
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

        <div className="px-6 pb-6 pt-4">
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

      {/* Header atas desktop: flat putih bersih tanpa bayangan */}
      <header className="sticky top-0 z-10 hidden bg-white shadow-lg md:ml-64 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-8 py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">
              Selamat datang, {name}
            </p>
          </div>

          <div className="flex flex-1 justify-center px-4">
            <Suspense
              fallback={
                <div className="h-10 w-full max-w-md rounded-xl bg-slate-100" />
              }
            >
              <DashboardSearchForm />
            </Suspense>
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
      <header className="flex items-center justify-between bg-indigo-950 px-4 py-3 text-white md:hidden">
        <Link href="/guru" aria-label="Literasik Dasbor Guru">
          <BrandCompactLogo />
        </Link>
        <span className="mr-auto ml-3 truncate text-xs text-indigo-200">
          {name}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-lg bg-rose-100 px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-200 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </form>
      </header>

      <div className="bg-white px-4 py-2 md:hidden">
        <Suspense fallback={null}>
          <DashboardSearchForm />
        </Suspense>
      </div>

      <nav
        aria-label="Navigasi guru"
        className="grid grid-cols-4 bg-white shadow-lg md:hidden"
      >
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
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
