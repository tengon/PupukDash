import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PICKED_UP', 'CANCELLED']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        farmer: true,
        warehouse: true,
        items: {
          include: {
            product: { select: { name: true, type: true, pricePerKg: true, subsidyPrice: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Get order error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data pesanan' },
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
    const { status, notes } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status wajib diisi' },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Status tidak valid. Pilihan: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        farmer: { select: { name: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      )
    }

    const statusLabels: Record<string, string> = {
      PENDING: 'Menunggu',
      CONFIRMED: 'Dikonfirmasi',
      PICKED_UP: 'Diambil',
      CANCELLED: 'Dibatalkan',
    }

    // If cancelling, restore stock
    if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      await db.$transaction(async (tx) => {
        for (const item of existing.items) {
          const stock = await tx.stock.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: existing.warehouseId,
                productId: item.productId,
              },
            },
          })

          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: stock.quantity + item.quantity },
            })
          }
        }
      })
    }

    const order = await db.order.update({
      where: { id },
      data: {
        status,
        ...(notes !== undefined && { notes }),
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

    // Log activity
    const actionType = status === 'CANCELLED' ? 'CANCEL_ORDER' : 'UPDATE_STATUS'
    await db.activityLog.create({
      data: {
        action: actionType,
        detail: `Status pesanan ${existing.orderNumber} diubah dari ${statusLabels[existing.status] || existing.status} ke ${statusLabels[status] || status}`,
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui pesanan' },
      { status: 500 }
    )
  }
}