import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

function getDatabaseUrl() {
  const customDbPath = path.resolve(process.cwd(), 'db/custom.db')
  if (fs.existsSync(customDbPath)) {
    return `file:${customDbPath}`
  }
  const prismaDevDb = path.resolve(process.cwd(), 'prisma/dev.db')
  if (fs.existsSync(prismaDevDb)) {
    return `file:${prismaDevDb}`
  }
  const prismaCustomDb = path.resolve(process.cwd(), 'prisma/custom.db')
  if (fs.existsSync(prismaCustomDb)) {
    return `file:${prismaCustomDb}`
  }
  return process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'prisma/dev.db')}`
}

const dbUrl = getDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

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