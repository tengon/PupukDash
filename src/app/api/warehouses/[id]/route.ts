import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const warehouse = await db.warehouse.findUnique({
      where: { id },
      include: {
        stock: {
          include: {
            product: { select: { name: true, type: true, pricePerKg: true, subsidyPrice: true } },
          },
        },
        _count: {
          select: { orders: true, distributions: true },
        },
      },
    })

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(warehouse)
  } catch (error) {
    console.error('Get warehouse error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data gudang' },
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

    const existing = await db.warehouse.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    const { code, name, address, province, district, regency, managerName, managerPhone, isActive } = body

    if (code && code !== existing.code) {
      const existingCode = await db.warehouse.findUnique({ where: { code } })
      if (existingCode) {
        return NextResponse.json(
          { error: 'Kode gudang sudah digunakan' },
          { status: 400 }
        )
      }
    }

    const warehouse = await db.warehouse.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(province !== undefined && { province }),
        ...(district !== undefined && { district }),
        ...(regency !== undefined && { regency }),
        ...(managerName !== undefined && { managerName }),
        ...(managerPhone !== undefined && { managerPhone }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(warehouse)
  } catch (error: unknown) {
    console.error('Update warehouse error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Kode gudang sudah digunakan' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal memperbarui data gudang' },
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

    const existing = await db.warehouse.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    await db.warehouse.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Gudang berhasil dinonaktifkan' })
  } catch (error) {
    console.error('Delete warehouse error:', error)
    return NextResponse.json(
      { error: 'Gagal menonaktifkan gudang' },
      { status: 500 }
    )
  }
}