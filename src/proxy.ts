/* Pemeriksaan cepat sebelum halaman dirender: tanpa cookie sesi yang sah, langsung ke /masuk.
   Ini hanya pemeriksaan awal (tanpa database). Pemeriksaan sebenarnya tetap di requireUser()
   pada setiap halaman dan server action. */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const session = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/masuk", request.url));
  return NextResponse.next();
}

export const config = {
  // Semua halaman kecuali Masuk/Daftar, API, dan file statis.
  matcher: ["/((?!masuk|daftar|api|_next/static|_next/image|favicon.ico).*)"],
};
