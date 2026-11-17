"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { loginAction, type LoginState } from "@/app/login/actions";
import { cn } from "@/lib/utils";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const hasError = Boolean(state.error);

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl bg-rose-50 p-3.5 text-sm text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div className="space-y-0.5">
            <p className="font-semibold text-rose-900">
              Autentikasi Tidak Berhasil
            </p>
            <p className="text-xs text-rose-700">
              {state.error}. Periksa kembali penulisan huruf besar, kecil, dan angka.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="username" className="text-sm font-semibold text-slate-900">
            Nama pengguna
          </label>
          <span className="hidden text-xs text-slate-400 sm:inline">
            ID Siswa / Guru
          </span>
        </div>
        <div className="relative">
          <User
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2",
              hasError ? "text-rose-500" : "text-slate-400",
            )}
          />
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            placeholder="Masukkan nama pengguna"
            className={cn(
              "h-11 w-full rounded-xl bg-slate-100 pr-4 pl-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2",
              hasError
                ? "ring-2 ring-rose-500 focus:ring-rose-500"
                : "focus:ring-indigo-600",
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="password" className="text-sm font-semibold text-slate-900">
            Kata sandi
          </label>
          <span className="hidden text-xs text-slate-400 sm:inline">
            Sandi akun sekolah
          </span>
        </div>
        <div className="relative">
          <Lock
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2",
              hasError ? "text-rose-500" : "text-slate-400",
            )}
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Masukkan kata sandi"
            className={cn(
              "h-11 w-full rounded-xl bg-slate-100 pr-11 pl-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2",
              hasError
                ? "ring-2 ring-rose-500 focus:ring-rose-500"
                : "focus:ring-indigo-600",
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white outline-none transition-all hover:bg-indigo-800 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{pending ? "Memproses..." : "Masuk"}</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
