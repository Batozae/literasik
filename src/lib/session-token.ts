import { jwtVerify, SignJWT } from "jose";

export type SessionRole = "STUDENT" | "TEACHER";
export type SessionClaims = { userId: number; role: SessionRole };

const SESSION_TTL_SECONDS = 8 * 60 * 60;

function isSessionRole(value: unknown): value is SessionRole {
  return value === "STUDENT" || value === "TEACHER";
}

export async function signSessionToken(
  claims: SessionClaims,
  secret: string,
  now: Date,
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ userId: claims.userId, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string,
  now: Date,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
      currentDate: now,
    });
    if (!Number.isInteger(payload.userId) || !isSessionRole(payload.role)) return null;
    return { userId: payload.userId as number, role: payload.role };
  } catch {
    return null;
  }
}
