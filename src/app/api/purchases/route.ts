import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function generatePurchaseNo() {
  const date = new Date()
  const year = date.getFullYear()
  const random = Math.floor(1000 + Math.random() * 9000)
  return `PO-SUP-${year}-${random}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId') || ''
    const search = searchParams.get('search') || ''

    const where = {
      ...(warehouseId ? { warehouseId } : {}),
      ...(search
        ? {
            OR: [
              { purchaseNo: { contains: search } },
              { supplierName: { contains: search } },
              { product: { name: { contains: search } } },
              { warehouse: { name: { contains: search } } },
            ],
          }
        : {}),
    }

    const purchases = await db.purchase.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true, type: true, pricePerKg: true, subsidyPrice: true, imageUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error('List purchases error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat daftar pembelian supplier' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierName, warehouseId, productId, quantity, pricePerKg, notes } = body

    if (!warehouseId || !productId || !quantity || quantity <= 0 || pricePerKg === undefined) {
      return NextResponse.json(
        { error: 'Gudang, Produk, Jumlah (kg), dan Harga per kg wajib diisi' },
        { status: 400 }
      )
    }

    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) {
      return NextResponse.json({ error: 'Gudang tidak ditemukan' }, { status: 404 })
    }

    const product = await db.fertilizerProduct.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Produk pupuk tidak ditemukan' }, { status: 404 })
    }

    const totalAmount = quantity * pricePerKg
    const purchaseNo = generatePurchaseNo()

    // Transaction: Create purchase + Auto Restock
    const result = await db.$transaction(async (tx) => {
      // 1. Create Purchase record
      const purchase = await tx.purchase.create({
        data: {
          purchaseNo,
          supplierName: supplierName || 'PT Pupuk Indonesia (Persero)',
          warehouseId,
          productId,
          quantity,
          pricePerKg,
          totalAmount,
          status: 'RECEIVED',
          notes: notes || null,
        },
        include: {
          warehouse: { select: { name: true, code: true } },
          product: { select: { name: true, type: true } },
        },
      })

      // 2. Add / Restock to Stock
      const stock = await tx.stock.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
      })

      if (stock) {
        await tx.stock.update({
          where: { id: stock.id },
          data: {
            quantity: stock.quantity + quantity,
            lastRestocked: new Date(),
          },
        })
      } else {
        await tx.stock.create({
          data: {
            warehouseId,
            productId,
            quantity,
            minStock: 500,
            lastRestocked: new Date(),
          },
        })
      }

      // 3. Sync Product PUD price with this Purchase's pricePerKg
      const currentDesc = product.description || ''
      const isNpk = product.type === 'NPK'
      let currentHet = product.pricePerKg || (isNpk ? 2300 : 2250)
      let currentPpts = currentHet - 150
      let cleanDesc = currentDesc

      if (currentDesc.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(currentDesc)
          if (typeof parsed.het === 'number') currentHet = parsed.het
          if (typeof parsed.ppts === 'number') currentPpts = parsed.ppts
          if (typeof parsed.desc === 'string') cleanDesc = parsed.desc
        } catch (e) {}
      }

      const updatedDesc = JSON.stringify({
        pud: pricePerKg,
        ppts: currentPpts,
        het: currentHet,
        desc: cleanDesc,
      })

      await tx.fertilizerProduct.update({
        where: { id: productId },
        data: { description: updatedDesc },
      })

      return purchase
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Create purchase error:', error)
    return NextResponse.json(
      { error: 'Gagal mencatat pembelian dari supplier' },
      { status: 500 }
    )
  }
}
