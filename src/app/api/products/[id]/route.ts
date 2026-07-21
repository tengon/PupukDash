import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await db.fertilizerProduct.findUnique({
      where: { id },
      include: {
        stock: {
          include: {
            warehouse: { select: { name: true, code: true, regency: true } },
          },
        },
        _count: { select: { orderItems: true } },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat produk' },
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

    const existing = await db.fertilizerProduct.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    const { name, type, pricePerKg, subsidyPrice, description, isActive } = body

    if (pricePerKg !== undefined && (typeof pricePerKg !== 'number' || pricePerKg < 0)) {
      return NextResponse.json(
        { error: 'Harga per kg harus berupa angka positif' },
        { status: 400 }
      )
    }

    if (subsidyPrice !== undefined && (typeof subsidyPrice !== 'number' || subsidyPrice < 0)) {
      return NextResponse.json(
        { error: 'Harga subsidi harus berupa angka positif' },
        { status: 400 }
      )
    }

    const product = await db.fertilizerProduct.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(pricePerKg !== undefined && { pricePerKg }),
        ...(subsidyPrice !== undefined && { subsidyPrice }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui produk' },
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

    const existing = await db.fertilizerProduct.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    await db.fertilizerProduct.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Produk berhasil dinonaktifkan' })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Gagal menonaktifkan produk' },
      { status: 500 }
    )
  }
}