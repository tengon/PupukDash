import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { formatRupiah, getStatusLabel } from '@/lib/format'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''

    if (q.length < 2) {
      return NextResponse.json({
        products: [],
        farmers: [],
        orders: [],
        warehouses: [],
      })
    }

    const products = await db.fertilizerProduct.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { type: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        pricePerKg: true,
      },
      take: 5,
    })

    const farmers = await db.farmer.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { nik: { contains: q } },
          { village: { contains: q } },
          { farmerGroup: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        nik: true,
        village: true,
        district: true,
        regency: true,
      },
      take: 5,
    })

    const orders = await db.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q } },
          { farmer: { name: { contains: q } } },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        farmer: {
          select: { name: true },
        },
      },
      take: 5,
    })

    const warehouses = await db.warehouse.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
          { address: { contains: q } },
          { managerName: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        regency: true,
        province: true,
      },
      take: 5,
    })

    const ppts = await db.ppts.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
          { district: { contains: q } },
          { address: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        district: true,
        address: true,
      },
      take: 5,
    })

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        subtitle: `${formatRupiah(p.pricePerKg)}/kg — ${p.type}`,
      })),
      farmers: farmers.map((f) => ({
        id: f.id,
        name: f.name,
        nik: f.nik,
        subtitle: `NIK: ${f.nik} — ${f.village || f.district || ''}, ${f.regency || ''}`.replace(/, $/, '').replace(/ — ,/, ' —'),
      })),
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        subtitle: `${o.farmer.name} — ${formatRupiah(o.totalAmount)} — ${getStatusLabel(o.status)}`,
        status: o.status,
      })),
      warehouses: warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        subtitle: `${w.code} — ${w.regency || ''}, ${w.province}`.replace(/^ — ,/, '').replace(/, $/, ''),
      })),
      ppts: ppts.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        subtitle: `${p.code} — Kec. ${p.district}`,
      })),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Gagal melakukan pencarian' },
      { status: 500 }
    )
  }
}