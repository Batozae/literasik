import "server-only";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signSessionToken, verifySessionToken } from "@/lib/session-token";
import { connection } from "next/server";

const SESSION_COOKIE = "literasik_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET belum dikonfigurasi.");
  return secret;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function createSession(user: {
  id: number;
  role: Role;
}): Promise<void> {
  const token = await signSessionToken(
    { userId: user.id, role: user.role },
    sessionSecret(),
    new Date(),
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  await connection();
  const claims = await verifySessionToken(token, sessionSecret(), new Date());
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, name: true, username: true, role: true },
  });
  if (!user || user.role !== claims.role) return null;
  return user;
}

export async function requireStudent() {
  const user = await getSession();
  if (!user || user.role !== "STUDENT") redirect("/login");
  return user;
}

export async function requireTeacher() {
  const user = await getSession();
  if (!user || user.role !== "TEACHER") redirect("/login");
  return user;
}

export async function assertTeacherOfClass(
  teacherId: number,
  classId: number,
): Promise<void> {
  const assignment = await prisma.teacherClass.findUnique({
    where: { teacherId_classId: { teacherId, classId } },
    select: { id: true },
  });
  if (!assignment)
    throw new Error("Akses ditolak: guru tidak mengajar kelas ini.");
}
