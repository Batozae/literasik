"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";

const links = [
  { href: "/siswa", label: "Beranda" },
  { href: "/siswa/asesmen", label: "Asesmen" },
  { href: "/siswa/peringkat", label: "Peringkat" },
  { href: "/siswa/riwayat", label: "Riwayat" },
];

function isActive(pathname: string, href: string) {
  return href === "/siswa" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function StudentNavigation({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <>
      <header className="hidden border-b border-slate-200 bg-white md:block">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-8 py-4">
          <Link href="/siswa" className="font-bold text-indigo-600">Literasik</Link>
          <nav aria-label="Navigasi siswa" className="flex items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${isActive(pathname, link.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="max-w-32 truncate text-sm text-slate-600">{name}</span>
            <form action={logoutAction}>
              <button className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <nav aria-label="Navigasi siswa" className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={`flex min-h-14 items-center justify-center px-1 text-center text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${isActive(pathname, link.href) ? "text-indigo-700" : "text-slate-600"}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-2 py-2">
          <span className="truncate text-xs text-slate-600">{name}</span>
          <form action={logoutAction}>
            <button className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
              Keluar
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}
