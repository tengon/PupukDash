import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate farmer exists
    const farmer = await db.farmer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nik: true,
        phone: true,
        address: true,
        village: true,
        district: true,
        regency: true,
        province: true,
        landAreaHa: true,
        farmerGroup: true,
        isActive: true,
      },
    })

    if (!farmer) {
      return NextResponse.json(
        { error: 'Petani tidak ditemukan' },
        { status: 404 }
      )
    }

    const orders = await db.order.findMany({
      where: { farmerId: id },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { name: true, type: true, subsidyPrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate summary stats
    const totalOrders = orders.length
    const totalKg = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
    const totalSubsidy = orders.reduce((sum, o) => sum + o.totalSubsidy, 0)
    const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0)

    return NextResponse.json({
      farmer,
      orders,
      summary: {
        totalOrders,
        totalKg,
        totalSubsidy,
        totalAmount,
      },
    })
  } catch (error) {
    console.error('Farmer orders error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat riwayat pesanan petani' },
      { status: 500 }
    )
  }
}