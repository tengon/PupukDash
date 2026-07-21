import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromWarehouseId, toWarehouseId, productId, quantity } = body

    if (!fromWarehouseId || !toWarehouseId || !productId || !quantity) {
      return NextResponse.json(
        { error: 'Gudang asal, gudang tujuan, produk, dan jumlah wajib diisi' },
        { status: 400 }
      )
    }

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { error: 'Gudang asal dan tujuan tidak boleh sama' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Jumlah transfer harus lebih dari 0' },
        { status: 400 }
      )
    }

    // Validate warehouses
    const [fromWarehouse, toWarehouse, product] = await Promise.all([
      db.warehouse.findUnique({ where: { id: fromWarehouseId } }),
      db.warehouse.findUnique({ where: { id: toWarehouseId } }),
      db.fertilizerProduct.findUnique({ where: { id: productId } }),
    ])

    if (!fromWarehouse) {
      return NextResponse.json(
        { error: 'Gudang asal tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!toWarehouse) {
      return NextResponse.json(
        { error: 'Gudang tujuan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check source stock
    const sourceStock = await db.stock.findUnique({
      where: {
        warehouseId_productId: { warehouseId: fromWarehouseId, productId },
      },
    })

    if (!sourceStock || sourceStock.quantity < quantity) {
      return NextResponse.json(
        { error: `Stok ${product.name} di ${fromWarehouse.name} tidak mencukupi. Tersedia: ${sourceStock?.quantity ?? 0} kg` },
        { status: 400 }
      )
    }

    // Perform atomic transfer
    await db.$transaction(async (tx) => {
      // Deduct from source
      await tx.stock.update({
        where: { id: sourceStock.id },
        data: { quantity: sourceStock.quantity - quantity },
      })

      // Add to destination (upsert)
      const destStock = await tx.stock.findUnique({
        where: {
          warehouseId_productId: { warehouseId: toWarehouseId, productId },
        },
      })

      if (destStock) {
        await tx.stock.update({
          where: { id: destStock.id },
          data: {
            quantity: destStock.quantity + quantity,
            lastRestocked: new Date(),
          },
        })
      } else {
        await tx.stock.create({
          data: {
            warehouseId: toWarehouseId,
            productId,
            quantity,
            minStock: 500,
            lastRestocked: new Date(),
          },
        })
      }
    })

    // Log activity
    logActivity('TRANSFER_STOCK', `Transfer ${quantity} kg ${product.name} dari ${fromWarehouse.name} ke ${toWarehouse.name}`)

    return NextResponse.json({
      message: `Berhasil mentransfer ${quantity} kg ${product.name} dari ${fromWarehouse.name} ke ${toWarehouse.name}`,
    })
  } catch (error) {
    console.error('Transfer stock error:', error)
    return NextResponse.json(
      { error: 'Gagal mentransfer stok' },
      { status: 500 }
    )
  }
}