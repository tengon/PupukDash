import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { db } from './db'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'sipupuk-secret-key-2024-change-in-production')

export interface AuthUser {
  id: string
  username: string
  name: string
  role: string
  ppstCode: string | null
  ppstName: string | null
}

export interface SessionPayload {
  userId: string
  username: string
  role: string
  exp: number
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed)
}

export async function createToken(user: AuthUser): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
  }
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function authenticateUser(username: string, password: string): Promise<AuthUser | null> {
  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true, password: true, name: true, role: true, ppstCode: true, ppstName: true, isActive: true },
  })
  if (!user || !user.isActive) return null
  const valid = await verifyPassword(password, user.password)
  if (!valid) return null
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  return { id: user.id, username: user.username, name: user.name, role: user.role, ppstCode: user.ppstCode, ppstName: user.ppstName }
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrator',
    OPERATOR: 'Operator PPST',
    VIEWER: 'Pemantau',
  }
  return labels[role] || role
}
