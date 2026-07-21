import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const VALID_STATUSES = ['DRAFT', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const distribution = await db.distribution.findUnique({
      where: { id },
      include: {
        warehouse: { select: { name: true, code: true, regency: true, province: true, address: true } },
      },
    })

    if (!distribution) {
      return NextResponse.json(
        { error: 'Distribusi tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(distribution)
  } catch (error) {
    console.error('Get distribution error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data distribusi' },
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
    const { status, notes, targetVillage, targetGroup } = body

    const existing = await db.distribution.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Distribusi tidak ditemukan' },
        { status: 404 }
      )
    }

    // If cancelling, restore stock
    if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      const stock = await db.stock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: existing.warehouseId,
            productId: existing.productId,
          },
        },
      })

      if (stock) {
        await db.stock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity + existing.quantity },
        })
      }
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Status tidak valid. Pilihan: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const distribution = await db.distribution.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(targetVillage !== undefined && { targetVillage }),
        ...(targetGroup !== undefined && { targetGroup }),
        ...(status === 'DELIVERED' && !existing.distributedAt ? { distributedAt: new Date() } : {}),
      },
      include: {
        warehouse: { select: { name: true, code: true, regency: true, province: true } },
      },
    })

    return NextResponse.json(distribution)
  } catch (error) {
    console.error('Update distribution error:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui distribusi' },
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

    const existing = await db.distribution.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Distribusi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Restore stock if not delivered
    if (existing.status !== 'DELIVERED') {
      const stock = await db.stock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: existing.warehouseId,
            productId: existing.productId,
          },
        },
      })

      if (stock) {
        await db.stock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity + existing.quantity },
        })
      }
    }

    await db.distribution.delete({ where: { id } })

    return NextResponse.json({ message: 'Distribusi berhasil dihapus' })
  } catch (error) {
    console.error('Delete distribution error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus distribusi' },
      { status: 500 }
    )
  }
}