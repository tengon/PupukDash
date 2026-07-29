import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

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
              { type: { contains: search } },
            ],
          }
        : {}),
    }

    const products = await db.fertilizerProduct.findMany({
      where,
      include: {
        stock: {
          select: { quantity: true, warehouse: { select: { name: true, code: true } } },
        },
        _count: { select: { orderItems: true } },
      },
      orderBy: { name: 'asc' },
    })

    const result = products.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      pricePerKg: p.pricePerKg,
      subsidyPrice: p.subsidyPrice,
      description: p.description,
      imageUrl: p.imageUrl,
      isActive: p.isActive,
      totalStock: p.stock.reduce((sum, s) => sum + s.quantity, 0),
      stockByWarehouse: p.stock.map((s) => ({
        warehouseName: s.warehouse.name,
        warehouseCode: s.warehouse.code,
        quantity: s.quantity,
      })),
      orderItemCount: p._count.orderItems,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('List products error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat daftar produk' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, pricePerKg, subsidyPrice, description, imageUrl } = body

    if (!name || !type || pricePerKg === undefined || subsidyPrice === undefined) {
      return NextResponse.json(
        { error: 'Nama, tipe, harga per kg, dan harga subsidi wajib diisi' },
        { status: 400 }
      )
    }

    if (typeof pricePerKg !== 'number' || pricePerKg < 0) {
      return NextResponse.json(
        { error: 'Harga per kg harus berupa angka positif' },
        { status: 400 }
      )
    }

    if (typeof subsidyPrice !== 'number' || subsidyPrice < 0) {
      return NextResponse.json(
        { error: 'Harga subsidi harus berupa angka positif' },
        { status: 400 }
      )
    }

    const product = await db.fertilizerProduct.create({
      data: {
        name,
        type,
        pricePerKg,
        subsidyPrice,
        description: description || null,
        imageUrl: imageUrl || null,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: unknown) {
    console.error('Create product error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Produk sudah ada' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menambahkan produk' },
      { status: 500 }
    )
  }
}