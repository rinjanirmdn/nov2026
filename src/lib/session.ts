import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "kb_session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 hari

interface Payload {
  uid: string;
  /** Naik setiap password diganti / semua sesi dikeluarkan. */
  ver: number;
}

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET belum diisi (minimal 32 karakter). Lihat .env.example.");
  return new TextEncoder().encode(secret);
}

export async function createSession(uid: string, ver: number) {
  const token = await new SignJWT({ uid, ver } satisfies Payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export const SESSION_COOKIE = COOKIE;

export async function readSession(): Promise<Payload | null> {
  return verifyToken((await cookies()).get(COOKIE)?.value);
}

/** Cek tanda tangan dan masa berlaku token. Tidak menyentuh database. */
export async function verifyToken(token: string | undefined): Promise<Payload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.uid !== "string" || typeof payload.ver !== "number") return null;
    return { uid: payload.uid, ver: payload.ver };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}
