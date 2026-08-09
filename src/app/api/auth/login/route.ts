import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default seed users
const DEFAULT_USERS = [
  {
    username: 'admin',
    name: 'Budi Santoso',
    password: 'password123',
    role: 'Administrator Distributor',
  },
  {
    username: 'gudang',
    name: 'Rudi Gudang',
    password: 'demo1234',
    role: 'Petugas Gudang',
  },
  {
    username: 'kios',
    name: 'Kios Pringapus',
    password: 'demo1234',
    role: 'Kios PPTS',
    ppstCode: 'PPTS-PRG-01',
    ppstName: 'Kios Pringapus Jaya',
  },
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan Password wajib diisi' },
        { status: 400 }
      )
    }

    // Seed default users if db is empty
    try {
      const count = await db.user.count()
      if (count === 0) {
        for (const u of DEFAULT_USERS) {
          await db.user.create({
            data: {
              username: u.username,
              name: u.name,
              password: u.password,
              role: u.role,
              ppstCode: u.ppstCode || null,
              ppstName: u.ppstName || null,
            },
          })
        }
      }
    } catch (e) {
      console.warn('Seed User Notice:', e)
    }

    // Find user in SQLite Database
    let user = null
    try {
      user = await db.user.findFirst({
        where: {
          username: username.trim(),
        },
      })
    } catch (e) {
      console.warn('Find user error:', e)
    }

    // Fallback match jika user belum ter-seed di DB
    if (!user) {
      const matchedDemo = DEFAULT_USERS.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      )
      if (matchedDemo && matchedDemo.password === password) {
        return NextResponse.json({
          success: true,
          user: {
            id: 'demo-id',
            username: matchedDemo.username,
            name: matchedDemo.name,
            role: matchedDemo.role,
          },
        })
      }

      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan di database' },
        { status: 401 }
      )
    }

    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Password salah' },
        { status: 401 }
      )
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan' },
        { status: 403 }
      )
    }

    // Update lastLoginAt if field exists
    try {
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    } catch {
      // Ignore if column doesn't exist
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error: any) {
    console.error('API Login Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses login database' },
      { status: 500 }
    )
  }
}
