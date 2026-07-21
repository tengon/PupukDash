import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')

    const where = warehouseId ? { warehouseId } : {}

    const stocks = await db.stock.findMany({
      where,
      include: {
        product: { select: { name: true, type: true, pricePerKg: true, subsidyPrice: true } },
        warehouse: { select: { name: true, code: true, regency: true, province: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(stocks)
  } catch (error) {
    console.error('List stock error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data stok' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, quantity, minStock } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID stok wajib diisi' },
        { status: 400 }
      )
    }

    const existing = await db.stock.findUnique({
      where: { id },
      include: {
        product: { select: { name: true } },
        warehouse: { select: { name: true } },
      },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Data stok tidak ditemukan' },
        { status: 404 }
      )
    }

    if (quantity !== undefined && quantity < 0) {
      return NextResponse.json(
        { error: 'Jumlah stok tidak boleh negatif' },
        { status: 400 }
      )
    }

    const stock = await db.stock.update({
      where: { id },
      data: {
        ...(quantity !== undefined && { quantity }),
        ...(minStock !== undefined && { minStock }),
      },
      include: {
        product: { select: { name: true, type: true, pricePerKg: true, subsidyPrice: true } },
        warehouse: { select: { name: true, code: true, regency: true, province: true } },
      },
    })

    // Log activity
    if (quantity !== undefined && quantity !== existing.quantity) {
      const diff = quantity - existing.quantity
      const direction = diff > 0 ? 'ditambah' : 'dikurangi'
      logActivity('UPDATE_STOCK', `Stok ${existing.product.name} di ${existing.warehouse.name} ${direction} menjadi ${quantity} kg`)
    }

    return NextResponse.json(stock)
  } catch (error) {
    console.error('Update stock error:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui data stok' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { warehouseId, productId, quantity, isRestock, minStock } = body

    if (!warehouseId || !productId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Warehouse ID, Product ID, dan jumlah wajib diisi' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Jumlah harus lebih dari 0' },
        { status: 400 }
      )
    }

    // Validate warehouse and product exist
    const [warehouse, product] = await Promise.all([
      db.warehouse.findUnique({ where: { id: warehouseId } }),
      db.fertilizerProduct.findUnique({ where: { id: productId } }),
    ])

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if stock entry exists for this warehouse-product combination
    const existingStock = await db.stock.findUnique({
      where: {
        warehouseId_productId: { warehouseId, productId },
      },
    })

    let result
    if (existingStock) {
      // Increment existing stock
      result = await db.stock.update({
        where: { id: existingStock.id },
        data: {
          quantity: existingStock.quantity + quantity,
          ...(isRestock ? { lastRestocked: new Date() } : {}),
          ...(minStock !== undefined ? { minStock } : {}),
        },
        include: {
          product: { select: { name: true, type: true, pricePerKg: true, subsidyPrice: true } },
          warehouse: { select: { name: true, code: true, regency: true, province: true } },
        },
      })
    } else {
      // Create new stock entry
      result = await db.stock.create({
        data: {
          warehouseId,
          productId,
          quantity,
          minStock: minStock ?? 500,
          ...(isRestock ? { lastRestocked: new Date() } : {}),
        },
        include: {
          product: { select: { name: true, type: true, pricePerKg: true, subsidyPrice: true } },
          warehouse: { select: { name: true, code: true, regency: true, province: true } },
        },
      })
    }

    // Log activity
    logActivity('ADD_STOCK', `Stok ${product.name} di ${warehouse.name} ditambah ${quantity} kg`)

    return NextResponse.json(result, { status: existingStock ? 200 : 201 })
  } catch (error) {
    console.error('Add stock error:', error)
    return NextResponse.json(
      { error: 'Gagal menambahkan stok' },
      { status: 500 }
    )
  }
}