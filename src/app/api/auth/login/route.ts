import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, createToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }
    const user = await authenticateUser(username, password)
    if (!user) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }
    const token = await createToken(user)
    const response = NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role, ppstCode: user.ppstCode, ppstName: user.ppstName },
    })
    response.cookies.set('sipupuk-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Gagal melakukan login' }, { status: 500 })
  }
}
