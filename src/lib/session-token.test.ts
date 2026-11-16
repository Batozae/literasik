import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "@/lib/session-token";

describe("session token", () => {
  const now = new Date("2026-11-16T00:00:00.000Z");
  const claims = { userId: 42, role: "STUDENT" as const };

  it("memverifikasi token valid", async () => {
    const token = await signSessionToken(claims, "test-secret", now);
    await expect(verifySessionToken(token, "test-secret", now)).resolves.toEqual(claims);
  });

  it("menolak token yang sudah kedaluwarsa", async () => {
    const token = await signSessionToken(claims, "test-secret", now);
    const afterExpiry = new Date(now.getTime() + 8 * 60 * 60 * 1000 + 1);
    await expect(verifySessionToken(token, "test-secret", afterExpiry)).resolves.toBeNull();
  });

  it("menolak token yang diubah atau ditandatangani dengan kunci lain", async () => {
    const token = await signSessionToken(claims, "test-secret", now);
    const [header, payload, signature] = token.split(".");
    const alteredPayload = `${payload.startsWith("e") ? "f" : "e"}${payload.slice(1)}`;
    const altered = `${header}.${alteredPayload}.${signature}`;
    await expect(verifySessionToken(altered, "test-secret", now)).resolves.toBeNull();
    await expect(verifySessionToken(token, "other-secret", now)).resolves.toBeNull();
  });
});
