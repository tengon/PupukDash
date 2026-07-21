import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [totalFarmers, totalProducts, totalWarehouses, totalOrders, salesAggregate] =
      await Promise.all([
        db.farmer.count({ where: { isActive: true } }),
        db.fertilizerProduct.count({ where: { isActive: true } }),
        db.warehouse.count({ where: { isActive: true } }),
        db.order.count(),
        db.order.aggregate({ _sum: { totalAmount: true, totalSubsidy: true } }),
      ])

    const recentOrders = await db.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: { select: { name: true, nik: true } },
        warehouse: { select: { name: true, code: true } },
      },
    })

    const allStocks = await db.stock.findMany({
      include: {
        product: { select: { name: true, type: true } },
        warehouse: { select: { name: true, code: true } },
      },
    })

    const stockAlerts = allStocks
      .filter((s) => s.quantity <= s.minStock)
      .map((s) => ({
        id: s.id, quantity: s.quantity, minStock: s.minStock,
        product: { id: s.productId, name: s.product.name, type: s.product.type },
        warehouse: { id: s.warehouseId, name: s.warehouse.name, code: s.warehouse.code },
      }))

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const monthlySales = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const agg = await db.order.aggregate({
        where: { createdAt: { gte: start, lte: end } },
        _sum: { totalAmount: true, totalSubsidy: true },
      })
      monthlySales.push({
        month: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        total: agg._sum.totalAmount ?? 0, subsidy: agg._sum.totalSubsidy ?? 0,
      })
    }

    const productTypeMap = new Map<string, number>()
    for (const s of allStocks) { productTypeMap.set(s.product.type, (productTypeMap.get(s.product.type) || 0) + s.quantity) }
    const productDistribution = Array.from(productTypeMap.entries()).map(([name, value]) => ({ name, value }))

    const topFarmers = recentOrders
      .filter((o) => o.status !== 'CANCELLED')
      .slice(0, 5)
      .map((o) => ({ id: o.farmerId, name: o.farmer.name, totalOrders: 1, totalAmount: o.totalAmount }))

    // Top farmer this month by order count
    const nowDash = new Date()
    const startOfThisMonth = new Date(nowDash.getFullYear(), nowDash.getMonth(), 1)
    const endOfThisMonth = new Date(nowDash.getFullYear(), nowDash.getMonth() + 1, 0, 23, 59, 59)
    const ordersThisMonth = await db.order.findMany({
      where: {
        createdAt: { gte: startOfThisMonth, lte: endOfThisMonth },
        status: { not: 'CANCELLED' },
      },
      include: { farmer: { select: { name: true, nik: true } } },
    })
    const farmerOrderCount = new Map<string, { id: string; name: string; totalOrders: number; totalAmount: number }>()
    for (const o of ordersThisMonth) {
      const existing = farmerOrderCount.get(o.farmerId)
      if (existing) {
        existing.totalOrders++
        existing.totalAmount += o.totalAmount
      } else {
        farmerOrderCount.set(o.farmerId, { id: o.farmerId, name: o.farmer.name, totalOrders: 1, totalAmount: o.totalAmount })
      }
    }
    const topFarmerThisMonth = Array.from(farmerOrderCount.values())
      .sort((a, b) => b.totalOrders - a.totalOrders || b.totalAmount - a.totalAmount)[0] || null

    // Daily sales this month
    const nowDaily = new Date()
    const daysInMonth = new Date(nowDaily.getFullYear(), nowDaily.getMonth() + 1, 0).getDate()
    const dailyOrders = await db.order.findMany({
      where: {
        createdAt: { gte: startOfThisMonth, lte: endOfThisMonth },
        status: { not: 'CANCELLED' },
      },
      include: { items: { select: { quantity: true } } },
    })

    // Initialize all days with zeros
    const dailyMap = new Map<number, { orders: number; totalKg: number; revenue: number }>()
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap.set(d, { orders: 0, totalKg: 0, revenue: 0 })
    }
    // Aggregate orders into daily buckets
    for (const o of dailyOrders) {
      const day = o.createdAt.getDate()
      const entry = dailyMap.get(day)!
      entry.orders++
      entry.revenue += o.totalAmount
      for (const item of o.items) {
        entry.totalKg += item.quantity
      }
    }

    const dailySalesThisMonth = Array.from(dailyMap.entries()).map(([day, data]) => ({
      day,
      orders: data.orders,
      totalKg: Math.round(data.totalKg),
      revenue: data.revenue,
    }))

    return NextResponse.json({
      totalFarmers, totalProducts, totalWarehouses, totalOrders,
      totalSalesAmount: salesAggregate._sum.totalAmount ?? 0,
      totalSubsidy: salesAggregate._sum.totalSubsidy ?? 0,
      recentOrders: recentOrders.map((o) => ({
        id: o.id, orderNumber: o.orderNumber, status: o.status,
        totalAmount: o.totalAmount, totalSubsidy: o.totalSubsidy,
        farmer: { id: o.farmerId, name: o.farmer.name, nik: o.farmer.nik },
        warehouse: { id: o.warehouseId, name: o.warehouse.name, code: o.warehouse.code },
        createdAt: o.createdAt,
      })),
      stockAlerts, monthlySales, productDistribution, topFarmers, topFarmerThisMonth, dailySalesThisMonth,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Gagal memuat data dashboard' }, { status: 500 })
  }
}
