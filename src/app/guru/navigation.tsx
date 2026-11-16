"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";

const links = [
  { href: "/guru", label: "Dasbor" },
  { href: "/guru/soal", label: "Bank Soal" },
  { href: "/guru/asesmen", label: "Asesmen" },
  { href: "/guru/peringkat", label: "Peringkat" },
];

function isActive(pathname: string, href: string) {
  return href === "/guru" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function TeacherNavigation({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white shadow-sm md:flex">
        <Link href="/guru" className="border-b border-slate-200 px-6 py-5 text-lg font-bold text-indigo-600">Literasik</Link>
        <nav aria-label="Navigasi guru" className="flex-1 space-y-1 p-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${isActive(pathname, link.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate px-3 pb-2 text-sm text-slate-600">{name}</p>
          <form action={logoutAction}>
            <button className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
              Keluar
            </button>
          </form>
        </div>
      </aside>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href="/guru" className="font-bold text-indigo-600">Literasik</Link>
        <span className="mr-auto ml-3 truncate text-sm text-slate-600">{name}</span>
        <form action={logoutAction}>
          <button className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">Keluar</button>
        </form>
      </header>
      <nav aria-label="Navigasi guru" className="grid grid-cols-4 border-b border-slate-200 bg-white md:hidden">
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={isActive(pathname, link.href) ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center px-1 text-center text-xs font-medium ${isActive(pathname, link.href) ? "text-indigo-700" : "text-slate-600"}`}>
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
