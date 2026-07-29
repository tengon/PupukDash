import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true, type: true, pricePerKg: true, subsidyPrice: true } },
      },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Data pembelian tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Get purchase detail error:', error)
    return NextResponse.json({ error: 'Gagal memuat detail pembelian' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { supplierName, warehouseId, productId, quantity, pricePerKg, notes, status } = body

    const existing = await db.purchase.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Data pembelian tidak ditemukan' }, { status: 404 })
    }

    const newWarehouseId = warehouseId || existing.warehouseId
    const newProductId = productId || existing.productId
    const newQuantity = quantity !== undefined ? Number(quantity) : existing.quantity
    const newPricePerKg = pricePerKg !== undefined ? Number(pricePerKg) : existing.pricePerKg
    const newStatus = status || existing.status

    if (newQuantity <= 0 || newPricePerKg < 0) {
      return NextResponse.json({ error: 'Jumlah (kg) dan harga harus positif' }, { status: 400 })
    }

    const newTotalAmount = newQuantity * newPricePerKg

    const updatedPurchase = await db.$transaction(async (tx) => {
      // Stock Adjustments
      const wasReceived = existing.status === 'RECEIVED'
      const isReceived = newStatus === 'RECEIVED'

      if (wasReceived) {
        // Revert old stock allocation
        const oldStock = await tx.stock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: existing.warehouseId,
              productId: existing.productId,
            },
          },
        })
        if (oldStock) {
          await tx.stock.update({
            where: { id: oldStock.id },
            data: {
              quantity: Math.max(0, oldStock.quantity - existing.quantity),
            },
          })
        }
      }

      if (isReceived) {
        // Apply new stock allocation
        const newStock = await tx.stock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: newWarehouseId,
              productId: newProductId,
            },
          },
        })

        if (newStock) {
          await tx.stock.update({
            where: { id: newStock.id },
            data: {
              quantity: newStock.quantity + newQuantity,
              lastRestocked: new Date(),
            },
          })
        } else {
          await tx.stock.create({
            data: {
              warehouseId: newWarehouseId,
              productId: newProductId,
              quantity: newQuantity,
              minStock: 500,
              lastRestocked: new Date(),
            },
          })
        }
      }

      // Update purchase order record
      const updated = await tx.purchase.update({
        where: { id },
        data: {
          ...(supplierName !== undefined && { supplierName }),
          warehouseId: newWarehouseId,
          productId: newProductId,
          quantity: newQuantity,
          pricePerKg: newPricePerKg,
          totalAmount: newTotalAmount,
          status: newStatus,
          ...(notes !== undefined && { notes }),
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          product: { select: { id: true, name: true, type: true, description: true, pricePerKg: true } },
        },
      })

      // Sync product PUD price with updated pricePerKg
      const targetProd = await tx.fertilizerProduct.findUnique({ where: { id: newProductId } })
      if (targetProd) {
        const currentDesc = targetProd.description || ''
        const isNpk = targetProd.type === 'NPK'
        let currentHet = targetProd.pricePerKg || (isNpk ? 2300 : 2250)
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
          pud: newPricePerKg,
          ppts: currentPpts,
          het: currentHet,
          desc: cleanDesc,
        })

        await tx.fertilizerProduct.update({
          where: { id: newProductId },
          data: { description: updatedDesc },
        })
      }

      return updated
    })

    return NextResponse.json(updatedPurchase)
  } catch (error) {
    console.error('Update purchase error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui data pembelian' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.purchase.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Data pembelian tidak ditemukan' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      // Revert stock if purchase was received
      if (existing.status === 'RECEIVED') {
        const stock = await tx.stock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: existing.warehouseId,
              productId: existing.productId,
            },
          },
        })
        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              quantity: Math.max(0, stock.quantity - existing.quantity),
            },
          })
        }
      }

      // Delete the purchase record
      await tx.purchase.delete({ where: { id } })
    })

    return NextResponse.json({ message: 'Pembelian supplier berhasil dihapus & stok disesuaikan' })
  } catch (error) {
    console.error('Delete purchase error:', error)
    return NextResponse.json({ error: 'Gagal menghapus data pembelian' }, { status: 500 })
  }
}
