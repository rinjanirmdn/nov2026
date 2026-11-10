import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { readSession } from "./session";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  householdId: string;
}

/** Pengguna yang sedang login, atau null. Dicache per request. */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const s = await readSession();
  if (!s) return null;
  const u = await db.user.findUnique({
    where: { id: s.uid },
    select: { id: true, name: true, email: true, householdId: true, sessionVersion: true },
  });
  if (!u || u.sessionVersion !== s.ver) return null;
  return { id: u.id, name: u.name, email: u.email, householdId: u.householdId };
});

/** Untuk halaman dan server action: wajib login, kalau tidak dialihkan ke /masuk. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getUser();
  if (!u) redirect("/masuk");
  return u;
}
