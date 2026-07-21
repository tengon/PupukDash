import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@/lib/db'

function generateDistributionNo(): string {
  const now = new Date()
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `DIST-${dateStr}-${random}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where = status ? { status } : {}

    const distributions = await db.distribution.findMany({
      where,
      include: {
        warehouse: { select: { name: true, code: true, regency: true, province: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(distributions)
  } catch (error) {
    console.error('List distributions error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat daftar distribusi' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { warehouseId, productId, quantity, targetVillage, targetGroup, notes } = body

    if (!warehouseId || !productId || !quantity) {
      return NextResponse.json(
        { error: 'Gudang ID, Produk ID, dan jumlah wajib diisi' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Jumlah harus lebih dari 0' },
        { status: 400 }
      )
    }

    // Validate warehouse
    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } })
    if (!warehouse) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Validate product
    const product = await db.fertilizerProduct.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check and deduct stock
    const stock = await db.stock.findUnique({
      where: {
        warehouseId_productId: { warehouseId, productId },
      },
    })

    if (!stock || stock.quantity < quantity) {
      return NextResponse.json(
        { error: 'Stok tidak mencukupi' },
        { status: 400 }
      )
    }

    // Deduct stock
    await db.stock.update({
      where: { id: stock.id },
      data: { quantity: stock.quantity - quantity },
    })

    // Generate distribution number
    let distributionNo = generateDistributionNo()
    // Ensure uniqueness
    let existing = await db.distribution.findUnique({ where: { distributionNo } })
    while (existing) {
      distributionNo = generateDistributionNo()
      existing = await db.distribution.findUnique({ where: { distributionNo } })
    }

    // Create distribution
    const distribution = await db.distribution.create({
      data: {
        distributionNo,
        warehouseId,
        productId,
        productName: product.name,
        quantity,
        sourceRegency: warehouse.regency || null,
        targetVillage: targetVillage || null,
        targetGroup: targetGroup || null,
        status: 'DRAFT',
        notes: notes || null,
      },
      include: {
        warehouse: { select: { name: true, code: true, regency: true, province: true } },
      },
    })

    // Log activity
    logActivity('CREATE_DISTRIBUTION', `Distribusi baru ${distributionNo} untuk ${quantity} kg ${product.name} dari ${warehouse.name}`)

    return NextResponse.json(distribution, { status: 201 })
  } catch (error) {
    console.error('Create distribution error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat distribusi' },
      { status: 500 }
    )
  }
}