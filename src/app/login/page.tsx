import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  Award,
  CheckCircle2,
  Clock,
  Globe,
  GraduationCap,
  Lock,
  MonitorPlay,
  ShieldCheck,
} from "lucide-react";
import { LoginForm } from "@/app/login/login-form";
import { getSession } from "@/lib/auth";
import { formatWibDateTime } from "@/lib/schedule";

const PILLAR_HIGHLIGHTS = [
  {
    number: "1",
    title: "Kecakapan Digital",
    desc: "Evaluasi validitas data & pemecahan masalah.",
    icon: MonitorPlay,
  },
  {
    number: "2",
    title: "Etika Digital",
    desc: "Santun berinteraksi dan hargai karya intelektual.",
    icon: ShieldCheck,
  },
  {
    number: "3",
    title: "Keamanan Digital",
    desc: "Perlindungan privasi data serta jejak digital aman.",
    icon: Lock,
  },
  {
    number: "4",
    title: "Budaya Digital",
    desc: "Penguatan nilai Pancasila di ruang maya.",
    icon: Globe,
  },
] as const;

async function AuthRedirect() {
  const user = await getSession();
  if (user) redirect(user.role === "STUDENT" ? "/siswa" : "/guru");
  return null;
}

async function ServerTimeText({ prefix }: { prefix: string }) {
  await connection();
  return (
    <span>
      {prefix} {formatWibDateTime(new Date())}
    </span>
  );
}

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <AuthRedirect />
      </Suspense>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-violet-100 px-4 py-10 md:pr-32 xl:pr-28 2xl:px-8">
        {/* Latar belakang ungu pastel cerah dengan dekorasi bubble flat */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <span className="absolute -top-28 -left-24 h-96 w-96 rounded-full bg-violet-200/80" />
          <span className="absolute top-1/3 left-10 h-28 w-28 rounded-full bg-teal-200/55" />
          <span className="absolute -top-20 -right-16 h-80 w-80 rounded-full bg-indigo-200/75" />
          <span className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-indigo-200/65" />
          <span className="absolute right-12 bottom-1/4 h-24 w-24 rounded-full bg-amber-200/60" />
          <span className="absolute -right-24 -bottom-20 h-80 w-80 rounded-full bg-violet-200/80" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-3xl bg-white shadow-xl shadow-indigo-950/10 ring-1 ring-indigo-950/5 md:grid md:max-w-4xl md:grid-cols-12 xl:max-w-5xl">
          {/* Panel Kiri Desktop: 4 Pilar Literasi Digital */}
          <aside className="relative hidden flex-col justify-between overflow-hidden rounded-l-3xl bg-indigo-950 p-8 text-white md:col-span-5 md:flex lg:p-10">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-indigo-800/35"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-teal-500/10"
            />

            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-indigo-100 uppercase">
                <GraduationCap className="h-4 w-4 text-teal-300" />
                <span>Literasi Digital SMP</span>
              </div>

              <div className="space-y-2.5">
                <h2 className="text-2xl leading-tight font-bold text-white lg:text-[26px]">
                  Empat Pilar Kecakapan Digital Generasi Muda
                </h2>
                <p className="text-sm leading-relaxed text-indigo-200/90">
                  Membangun ketajaman berpikir kritis, etika siber, dan navigasi
                  informasi objektif bagi siswa-siswi SMP di era kecerdasan
                  digital.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {PILLAR_HIGHLIGHTS.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.number}
                      className="group flex items-center gap-3.5 rounded-2xl bg-white/10 p-3.5 transition-all duration-150 hover:translate-x-1 hover:bg-white/15"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-teal-300 transition-transform duration-150 group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">
                          {pillar.number}. {pillar.title}
                        </p>
                        <p className="text-xs text-indigo-200/85">
                          {pillar.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative mt-8 flex items-center justify-between border-t border-white/15 pt-4 text-xs text-indigo-200">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Award className="h-4 w-4 text-amber-400" />
                <span>Asesmen &amp; Latihan Terpadu</span>
              </span>
              <span className="font-semibold text-white">Jenjang SMP</span>
            </div>
          </aside>

          {/* Panel Kanan Desktop / Konten Utama Mobile */}
          <section className="relative flex flex-col justify-between rounded-3xl bg-white p-6 sm:p-8 md:col-span-7 md:rounded-l-none md:rounded-r-3xl md:p-10">
            <div className="space-y-6">
              {/* Header Maskot Interaktif + Form Masuk */}
              <LoginForm />

              {/* Info Akun Sekolah Mobile */}
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 md:hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p className="leading-relaxed">
                  Gunakan akun yang diberikan oleh pihak sekolah atau guru
                  pembimbing.
                </p>
              </div>
            </div>

            {/* Footer Mobile */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 md:hidden">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <Suspense fallback={<span>Server aktif</span>}>
                <ServerTimeText prefix="Server aktif ·" />
              </Suspense>
            </div>

            {/* Footer Desktop */}
            <footer className="mt-8 hidden flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 md:flex">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Portal Pembelajaran &amp; Asesmen SMP</span>
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <Suspense fallback={<span>Waktu Sistem: WIB</span>}>
                  <ServerTimeText prefix="Waktu Sistem:" />
                </Suspense>
              </span>
            </footer>
          </section>
        </div>
      </main>
    </>
  );
}
