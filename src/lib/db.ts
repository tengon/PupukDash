import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** Safely log activity without crashing the main flow */
export async function logActivity(action: string, detail: string) {
  try {
    if (db.activityLog) {
      await db.activityLog.create({ data: { action, detail } })
    }
  } catch {
    // Activity logging is non-critical, silently ignore errors
  }
}