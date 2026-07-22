import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('sipupuk-session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      const response = NextResponse.json({ error: 'Sesi telah berakhir' }, { status: 401 })
      response.cookies.delete('sipupuk-session')
      return response
    }
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, name: true, role: true, ppstCode: true, ppstName: true, isActive: true },
    })
    if (!user || !user.isActive) {
      const response = NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 401 })
      response.cookies.delete('sipupuk-session')
      return response
    }
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: 'Gagal memverifikasi sesi' }, { status: 500 })
  }
}
