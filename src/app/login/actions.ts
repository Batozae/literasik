"use server";

import { redirect } from "next/navigation";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = { error: string | null };

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const user = username
    ? await prisma.user.findUnique({ where: { username } })
    : null;

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Nama pengguna atau kata sandi salah" };
  }

  await createSession(user);
  redirect(user.role === "STUDENT" ? "/siswa" : "/guru");
}
