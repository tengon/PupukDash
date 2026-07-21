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
    })

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    const stockEntries = await db.stock.findMany({
      where: { warehouseId: id },
      include: {
        product: { select: { name: true, type: true, pricePerKg: true, subsidyPrice: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const totalStock = stockEntries.reduce((sum, s) => sum + s.quantity, 0)
    const lowStockCount = stockEntries.filter((s) => s.quantity <= s.minStock).length

    return NextResponse.json({
      warehouse: {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        address: warehouse.address,
        district: warehouse.district,
        regency: warehouse.regency,
        province: warehouse.province,
        managerName: warehouse.managerName,
        managerPhone: warehouse.managerPhone,
      },
      stockEntries: stockEntries.map((s) => ({
        id: s.id,
        productName: s.product.name,
        productType: s.product.type,
        quantity: s.quantity,
        minStock: s.minStock,
        lastRestocked: s.lastRestocked,
        subsidyPrice: s.product.subsidyPrice,
      })),
      summary: {
        totalStock,
        totalProducts: stockEntries.length,
        lowStockCount,
      },
    })
  } catch (error) {
    console.error('Warehouse stock detail error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data stok gudang' },
      { status: 500 }
    )
  }
}
