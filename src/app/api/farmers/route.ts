import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { nik: { contains: search } },
              { village: { contains: search } },
              { district: { contains: search } },
            ],
          }
        : {}),
    }

    const farmers = await db.farmer.findMany({
      where,
      include: {
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(farmers)
  } catch (error) {
    console.error('List farmers error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat daftar petani' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nik, name, phone, address, village, district, regency, province, landAreaHa, farmerGroup } = body

    if (!nik || !name) {
      return NextResponse.json(
        { error: 'NIK dan nama wajib diisi' },
        { status: 400 }
      )
    }

    if (!/^\d{16}$/.test(nik)) {
      return NextResponse.json(
        { error: 'NIK harus berupa 16 digit angka' },
        { status: 400 }
      )
    }

    const existingNik = await db.farmer.findUnique({ where: { nik } })
    if (existingNik) {
      return NextResponse.json(
        { error: 'NIK sudah terdaftar' },
        { status: 400 }
      )
    }

    const farmer = await db.farmer.create({
      data: {
        nik,
        name,
        phone: phone || null,
        address: address || null,
        village: village || null,
        district: district || null,
        regency: regency || null,
        province: province || null,
        landAreaHa: landAreaHa ?? null,
        farmerGroup: farmerGroup || null,
      },
    })

    return NextResponse.json(farmer, { status: 201 })
  } catch (error: unknown) {
    console.error('Create farmer error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'NIK sudah terdaftar' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menambahkan petani' },
      { status: 500 }
    )
  }
}