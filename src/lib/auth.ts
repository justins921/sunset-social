import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Minimal admin auth: a single shared password (ADMIN_PASSWORD) gates the
// score-entry area. On success we set a signed, httpOnly cookie containing an
// expiry; every admin page/action re-verifies it. No database or user table.
// ---------------------------------------------------------------------------

const COOKIE = "ss_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function adminPassword(): string | undefined {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length > 0 ? p : undefined;
}

/** Admin is only usable once a password has been configured. */
export function adminConfigured(): boolean {
  return Boolean(adminPassword());
}

function secret(): string {
  // Prefer a dedicated secret; fall back to deriving one from the password.
  return (
    process.env.ADMIN_SESSION_SECRET ||
    (adminPassword() ? `session:${adminPassword()}` : "insecure-dev-secret")
  );
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Constant-time password check. */
export function checkPassword(input: string): boolean {
  const pw = adminPassword();
  if (!pw) return false;
  return safeEqual(input, pw);
}

function makeToken(): string {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${exp}`;
  return `${payload}.${sign(payload)}`;
}

function tokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payload))) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

export function startSession(): void {
  cookies().set(COOKIE, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function endSession(): void {
  cookies().delete(COOKIE);
}

export function isAuthed(): boolean {
  return tokenValid(cookies().get(COOKIE)?.value);
}
