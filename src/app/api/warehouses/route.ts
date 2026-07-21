import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const warehouses = await db.warehouse.findMany({
      where: { isActive: true },
      include: {
        stock: {
          include: {
            product: { select: { name: true, type: true } },
          },
        },
        _count: {
          select: { orders: true, distributions: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const result = warehouses.map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      address: w.address,
      district: w.district,
      regency: w.regency,
      province: w.province,
      managerName: w.managerName,
      managerPhone: w.managerPhone,
      totalStock: w.stock.reduce((sum, s) => sum + s.quantity, 0),
      stockEntries: w.stock.length,
      orderCount: w._count.orders,
      distributionCount: w._count.distributions,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('List warehouses error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat daftar gudang' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, address, province, district, regency, managerName, managerPhone } = body

    if (!code || !name || !address || !province) {
      return NextResponse.json(
        { error: 'Kode, nama, alamat, dan provinsi wajib diisi' },
        { status: 400 }
      )
    }

    const existingCode = await db.warehouse.findUnique({ where: { code } })
    if (existingCode) {
      return NextResponse.json(
        { error: 'Kode gudang sudah digunakan' },
        { status: 400 }
      )
    }

    const warehouse = await db.warehouse.create({
      data: {
        code,
        name,
        address,
        province,
        district: district || null,
        regency: regency || null,
        managerName: managerName || null,
        managerPhone: managerPhone || null,
      },
    })

    return NextResponse.json(warehouse, { status: 201 })
  } catch (error: unknown) {
    console.error('Create warehouse error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Kode gudang sudah digunakan' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menambahkan gudang' },
      { status: 500 }
    )
  }
}