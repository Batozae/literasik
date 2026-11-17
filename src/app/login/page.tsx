import { Suspense } from "react";
import Image from "next/image";
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
import { BrandWordmark } from "@/components/brand-logo";
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

      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white md:grid md:max-w-5xl md:grid-cols-12">
          {/* Panel Kiri Desktop: 4 Pilar Literasi Digital (Flat & Interaktif) */}
          <aside className="relative hidden flex-col justify-between overflow-hidden bg-indigo-950 p-8 text-white md:col-span-5 md:flex lg:p-10">
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
                  informasi objektif bagi siswa-siswi SMP di era kecerdasan digital.
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
          <section className="flex flex-col justify-between p-6 sm:p-8 md:col-span-7 md:p-10">
            <div className="space-y-6">
              {/* Header Mobile (sesuai referensi mobile) */}
              <div className="flex flex-col items-center text-center md:hidden">
                <div className="h-24 w-24 overflow-hidden rounded-2xl">
                  <Image
                    src="/literasik-owl.jpg"
                    alt="Maskot Burung Hantu Literasik"
                    width={108}
                    height={108}
                    priority
                    className="h-full w-full scale-125 object-cover"
                  />
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-[11px] font-bold tracking-wide text-teal-700 uppercase">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Asesmen Literasi Digital SMP
                </span>
                <h1 className="mt-2.5">
                  <BrandWordmark darkBg={false} className="text-3xl" />
                </h1>
                <p className="mt-1.5 text-sm text-slate-600">
                  Ukur kecakapan digital, raih prestasi bersama Literasik.
                </p>
              </div>

              {/* Header Desktop (sesuai referensi desktop) */}
              <div className="hidden space-y-4 md:block">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                      <Image
                        src="/literasik-owl.jpg"
                        alt="Maskot Burung Hantu Literasik"
                        width={72}
                        height={72}
                        priority
                        className="h-full w-full scale-125 object-cover"
                      />
                    </div>
                    <div>
                      <p className="leading-tight">
                        <BrandWordmark darkBg={false} className="text-xl" />
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Platform Asesmen Mandiri
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                    Asesmen Literasi Digital SMP
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">
                    Ukur kecakapan digital, raih prestasi bersama Literasik.
                  </h1>
                  <p className="text-sm text-slate-600">
                    Masukkan kredensial akun peserta didik atau pendidik untuk
                    membuka sesi asesmen dan analitik.
                  </p>
                </div>
              </div>

              {/* Form Masuk (1 instance untuk desktop & mobile) */}
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
