import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      totalFarmers,
      totalProducts,
      totalWarehouses,
      totalOrders,
      salesAggregate,
      recentOrders,
      stockAlerts,
      ordersForMonthly,
      ordersForProductType,
      ordersForTopFarmers,
    ] = await Promise.all([
      db.farmer.count({ where: { isActive: true } }),
      db.fertilizerProduct.count({ where: { isActive: true } }),
      db.warehouse.count({ where: { isActive: true } }),
      db.order.count(),
      db.order.aggregate({ _sum: { totalAmount: true, totalSubsidy: true } }),
      db.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: { select: { name: true, nik: true } },
          warehouse: { select: { name: true, code: true } },
        },
      }),
      db.stock.findMany({
        where: { quantity: { lte: db.stock.fields.minStock } },
        include: {
          product: { select: { name: true, type: true } },
          warehouse: { select: { name: true, code: true } },
        },
      }),
      db.order.findMany({
        where: {
          createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
        },
        select: {
          totalAmount: true,
          totalSubsidy: true,
          createdAt: true,
        },
      }),
      db.orderItem.findMany({
        include: {
          product: { select: { type: true } },
        },
      }),
      db.order.findMany({
        include: {
          farmer: { select: { name: true } },
        },
      }),
    ])

    // Sales by month (last 6 months)
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ]
    const monthlyMap = new Map<string, { total: number; subsidy: number }>()

    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap.set(key, { total: 0, subsidy: 0 })
    }

    for (const order of ordersForMonthly) {
      const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap.has(key)) {
        const entry = monthlyMap.get(key)!
        entry.total += order.totalAmount
        entry.subsidy += order.totalSubsidy
      }
    }

    const monthlySales = Array.from(monthlyMap.entries()).map(([key, val]) => {
      const [year, month] = key.split('-')
      return {
        month: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
        total: val.total,
        subsidy: val.subsidy,
      }
    })

    // Sales by product type for pie chart
    const productTypeMap = new Map<string, number>()
    for (const item of ordersForProductType) {
      const type = item.product.type.toUpperCase()
      if (!productTypeMap.has(type)) {
        productTypeMap.set(type, 0)
      }
      productTypeMap.set(type, productTypeMap.get(type)! + item.quantity)
    }

    const productDistribution = Array.from(productTypeMap.entries()).map(
      ([name, value]) => ({ name, value })
    )

    // Top 5 farmers by total purchase amount
    const farmerMap = new Map<string, { name: string; totalAmount: number; totalOrders: number }>()
    for (const order of ordersForTopFarmers) {
      if (order.status === 'CANCELLED') continue
      if (!farmerMap.has(order.farmerId)) {
        farmerMap.set(order.farmerId, {
          name: order.farmer.name,
          totalAmount: 0,
          totalOrders: 0,
        })
      }
      const entry = farmerMap.get(order.farmerId)!
      entry.totalAmount += order.totalAmount
      entry.totalOrders += 1
    }

    const topFarmers = Array.from(farmerMap.entries())
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)

    return NextResponse.json({
      totalFarmers,
      totalProducts,
      totalWarehouses,
      totalOrders,
      totalSalesAmount: salesAggregate._sum.totalAmount ?? 0,
      totalSubsidy: salesAggregate._sum.totalSubsidy ?? 0,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        totalSubsidy: o.totalSubsidy,
        farmer: { id: o.farmerId, name: o.farmer.name, nik: o.farmer.nik },
        warehouse: { id: o.warehouseId, name: o.warehouse.name, code: o.warehouse.code },
        createdAt: o.createdAt,
      })),
      stockAlerts: stockAlerts.map((s) => ({
        id: s.id,
        quantity: s.quantity,
        minStock: s.minStock,
        product: { id: s.productId, name: s.product.name, type: s.product.type },
        warehouse: { id: s.warehouseId, name: s.warehouse.name, code: s.warehouse.code },
      })),
      monthlySales,
      productDistribution,
      topFarmers,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data dashboard' },
      { status: 500 }
    )
  }
}