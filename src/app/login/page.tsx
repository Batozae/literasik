import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { getSession } from "@/lib/auth";

async function AuthRedirect() {
  const user = await getSession();
  if (user) redirect(user.role === "STUDENT" ? "/siswa" : "/guru");
  return null;
}

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <AuthRedirect />
      </Suspense>
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="space-y-2">
            <p className="text-sm font-semibold text-indigo-600">Literasik</p>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Masuk
            </h1>
            <p className="text-sm text-slate-600">
              Masuk untuk melanjutkan ke ruang belajar Literasik.
            </p>
          </header>
          <LoginForm />
        </section>
      </main>
    </>
  );
}
