import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@/lib/db'

function generateOrderNumber(): string {
  const now = new Date()
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `SO-${dateStr}-${random}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search') || ''
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '1000')))

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { farmer: { name: { contains: search } } },
        { farmer: { nik: { contains: search } } },
      ]
    }
    if (fromDate || toDate) {
      const createdAt: Record<string, unknown> = {}
      if (fromDate) {
        createdAt.gte = new Date(fromDate)
      }
      if (toDate) {
        const to = new Date(toDate)
        to.setHours(23, 59, 59, 999)
        createdAt.lte = to
      }
      where.createdAt = createdAt
    }

    const [orders, total, statusCounts] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          farmer: { select: { id: true, name: true, nik: true, village: true, district: true } },
          warehouse: { select: { id: true, name: true, code: true, regency: true } },
          items: {
            include: {
              product: { select: { name: true, type: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
      db.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ])

    const byStatus: Record<string, number> = {}
    for (const sc of statusCounts) {
      byStatus[sc.status] = sc._count.status
    }

    return NextResponse.json({
      orders,
      summary: {
        total,
        byStatus,
      },
    })
  } catch (error) {
    console.error('List orders error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat daftar pesanan' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { farmerId, warehouseId, items, notes } = body

    if (!farmerId || !warehouseId || !items || !items.length) {
      return NextResponse.json(
        { error: 'Petani ID, Gudang ID, dan item pesanan wajib diisi' },
        { status: 400 }
      )
    }

    // Validate farmer or PPTS
    let farmer = await db.farmer.findUnique({ where: { id: farmerId } })
    if (!farmer) {
      const pptsItem = await db.ppts.findUnique({ where: { id: farmerId } })
      if (pptsItem) {
        farmer = await db.farmer.upsert({
          where: { id: pptsItem.id },
          update: { name: pptsItem.name, nik: pptsItem.code },
          create: {
            id: pptsItem.id,
            name: pptsItem.name,
            nik: pptsItem.code,
            address: pptsItem.address,
            district: pptsItem.district,
            village: pptsItem.village,
            phone: pptsItem.phone,
          },
        })
      } else {
        return NextResponse.json(
          { error: 'PPTS tidak ditemukan' },
          { status: 404 }
        )
      }
    }

    // Validate warehouse
    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Validate all items and check stock
    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await db.fertilizerProduct.findMany({
      where: { id: { in: productIds } },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Setiap item harus memiliki Product ID dan jumlah yang valid' },
          { status: 400 }
        )
      }

      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Produk dengan ID ${item.productId} tidak ditemukan` },
          { status: 404 }
        )
      }

      // Check stock
      let stock = await db.stock.findUnique({
        where: {
          warehouseId_productId: { warehouseId, productId: item.productId },
        },
      })

      if (!stock) {
        // Auto-initialize stock entry with default 3000 kg if not yet initialized for this warehouse
        stock = await db.stock.create({
          data: {
            warehouseId,
            productId: item.productId,
            quantity: 3000,
            minStock: 500,
            lastRestocked: new Date(),
          },
        })
      }

      if (stock.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Stok ${product.name} tidak mencukupi di gudang ini. Tersedia: ${stock.quantity} kg, dibutuhkan: ${item.quantity} kg` },
          { status: 400 }
        )
      }
    }

    // Calculate totals
    let totalAmount = 0
    let totalSubsidy = 0
    const orderItemsData: Array<{
      productId: string
      productName: string
      quantity: number
      pricePerKg: number
      subtotal: number
    }> = []

    for (const item of items) {
      const product = productMap.get(item.productId)!
      const subtotal = product.pricePerKg * item.quantity

      totalAmount += subtotal
      totalSubsidy += product.subsidyPrice * item.quantity

      orderItemsData.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        pricePerKg: product.pricePerKg,
        subtotal,
      })
    }

    // Generate order number
    let orderNumber = generateOrderNumber()
    let existing = await db.order.findUnique({ where: { orderNumber } })
    while (existing) {
      orderNumber = generateOrderNumber()
      existing = await db.order.findUnique({ where: { orderNumber } })
    }

    // Create order with items in a transaction
    const order = await db.$transaction(async (tx) => {
      // Deduct stock for each item
      for (const item of items) {
        const stock = await tx.stock.findUnique({
          where: {
            warehouseId_productId: { warehouseId, productId: item.productId },
          },
        })

        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity - item.quantity },
          })
        }
      }

      // Create order
      return tx.order.create({
        data: {
          orderNumber,
          farmerId,
          warehouseId,
          totalAmount,
          totalSubsidy,
          status: 'PENDING',
          notes: notes || null,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          farmer: { select: { id: true, name: true, nik: true, village: true, district: true } },
          warehouse: { select: { id: true, name: true, code: true, regency: true } },
          items: {
            include: {
              product: { select: { name: true, type: true } },
            },
          },
        },
      })
    })

    // Log activity (non-critical)
    logActivity('CREATE_ORDER', `Pesanan baru ${orderNumber} dari ${farmer.name} sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalAmount)}`)

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat pesanan' },
      { status: 500 }
    )
  }
}