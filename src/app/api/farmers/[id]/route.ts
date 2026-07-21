import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const farmer = await db.farmer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            warehouse: { select: { name: true, code: true } },
            items: { include: { product: { select: { name: true, type: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { orders: true } },
      },
    })

    if (!farmer) {
      return NextResponse.json(
        { error: 'Petani tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(farmer)
  } catch (error) {
    console.error('Get farmer error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data petani' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.farmer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Petani tidak ditemukan' },
        { status: 404 }
      )
    }

    const { nik, name, phone, address, village, district, regency, province, landAreaHa, farmerGroup, isActive } = body

    if (nik !== undefined && !/^\d{16}$/.test(nik)) {
      return NextResponse.json(
        { error: 'NIK harus berupa 16 digit angka' },
        { status: 400 }
      )
    }

    if (nik && nik !== existing.nik) {
      const existingNik = await db.farmer.findUnique({ where: { nik } })
      if (existingNik) {
        return NextResponse.json(
          { error: 'NIK sudah digunakan oleh petani lain' },
          { status: 400 }
        )
      }
    }

    const farmer = await db.farmer.update({
      where: { id },
      data: {
        ...(nik !== undefined && { nik }),
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(village !== undefined && { village }),
        ...(district !== undefined && { district }),
        ...(regency !== undefined && { regency }),
        ...(province !== undefined && { province }),
        ...(landAreaHa !== undefined && { landAreaHa }),
        ...(farmerGroup !== undefined && { farmerGroup }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(farmer)
  } catch (error: unknown) {
    console.error('Update farmer error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'NIK sudah digunakan' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal memperbarui data petani' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.farmer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Petani tidak ditemukan' },
        { status: 404 }
      )
    }

    await db.farmer.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Petani berhasil dinonaktifkan' })
  } catch (error) {
    console.error('Delete farmer error:', error)
    return NextResponse.json(
      { error: 'Gagal menonaktifkan petani' },
      { status: 500 }
    )
  }
}