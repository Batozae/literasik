"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium text-slate-900">
          Nama pengguna
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-900">
          Kata sandi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-lg bg-indigo-600 px-4 font-semibold text-white outline-none transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
