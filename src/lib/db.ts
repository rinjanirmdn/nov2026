import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function create() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diisi. Lihat .env.example.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Satu instance saja selama dev server berjalan (hot reload membuat modul ini dimuat ulang).
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? create();
if (process.env.NODE_ENV !== "production") g.prisma = db;
