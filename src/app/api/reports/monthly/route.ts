import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@/lib/db'
import { normalizeProductType } from '@/lib/het'

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')

    if (!monthParam) {
      return NextResponse.json(
        { error: 'Parameter ?month=YYYY-MM wajib diisi' },
        { status: 400 }
      )
    }

    const parts = monthParam.split('-')
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return NextResponse.json(
        { error: 'Format bulan tidak valid. Gunakan YYYY-MM' },
        { status: 400 }
      )
    }

    const year = parseInt(parts[0])
    const month = parseInt(parts[1])

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Format bulan tidak valid. Gunakan YYYY-MM' },
        { status: 400 }
      )
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999) // last day of month

    // Fetch all orders in the period with items and relations
    const orders = await db.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        farmer: { select: { id: true, name: true, nik: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { name: true, type: true, subsidyPrice: true } },
          },
        },
      },
    })

    // Status counts
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length
    const pendingOrders = orders.filter((o) => o.status === 'PENDING').length
    const totalOrders = orders.length

    // Track unique farmers and products
    const farmerSet = new Set<string>()
    const productSet = new Set<string>()

    // Aggregate metrics
    let totalKgSold = 0
    let totalRevenue = 0
    let totalSubsidy = 0

    // By product grouping
    const byProductMap = new Map<string, {
      productName: string
      productType: string
      totalKg: number
      totalRevenue: number
      totalSubsidy: number
      orderCount: Set<string>
    }>()

    // By warehouse grouping
    const byWarehouseMap = new Map<string, {
      warehouseId: string
      warehouseName: string
      warehouseCode: string
      totalOrders: number
      totalKg: number
      totalRevenue: number
      totalSubsidy: number
    }>()

    // Top farmers grouping
    const farmerMap = new Map<string, {
      farmerId: string
      farmerName: string
      farmerNik: string
      totalOrders: number
      totalKg: number
      totalAmount: number
      totalSubsidy: number
    }>()

    // Daily sales
    const daysInMonth = endDate.getDate()
    const dailySales: Array<{ date: string; orders: number; kg: number; revenue: number }> = []
    const dailyMap = new Map<string, { orders: number; kg: number; revenue: number }>()

    // Initialize all days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      dailySales.push({ date: dateStr, orders: 0, kg: 0, revenue: 0 })
      dailyMap.set(dateStr, { orders: 0, kg: 0, revenue: 0 })
    }

    for (const order of orders) {
      farmerSet.add(order.farmerId)

      // Update warehouse stats
      const whKey = order.warehouseId
      if (!byWarehouseMap.has(whKey)) {
        byWarehouseMap.set(whKey, {
          warehouseId: order.warehouse.id,
          warehouseName: order.warehouse.name,
          warehouseCode: order.warehouse.code,
          totalOrders: 0,
          totalKg: 0,
          totalRevenue: 0,
          totalSubsidy: 0,
        })
      }
      const wh = byWarehouseMap.get(whKey)!
      wh.totalOrders += 1

      // Track daily stats
      const dayStr = order.createdAt.toISOString().split('T')[0]
      const daily = dailyMap.get(dayStr)
      if (daily) {
        daily.orders += 1
      }

      // Update farmer stats
      if (!farmerMap.has(order.farmerId)) {
        farmerMap.set(order.farmerId, {
          farmerId: order.farmer.id,
          farmerName: order.farmer.name,
          farmerNik: order.farmer.nik,
          totalOrders: 0,
          totalKg: 0,
          totalAmount: 0,
          totalSubsidy: 0,
        })
      }
      const fStats = farmerMap.get(order.farmerId)!
      fStats.totalOrders += 1
      fStats.totalAmount += order.totalAmount
      fStats.totalSubsidy += order.totalSubsidy

      for (const item of order.items) {
        productSet.add(item.productId)
        totalKgSold += item.quantity
        totalRevenue += item.subtotal
        totalSubsidy += item.product.subsidyPrice * item.quantity

        // By product
        const pType = normalizeProductType(item.product.name)
        const pKey = pType
        if (!byProductMap.has(pKey)) {
          byProductMap.set(pKey, {
            productName: item.product.name,
            productType: pType,
            totalKg: 0,
            totalRevenue: 0,
            totalSubsidy: 0,
            orderCount: new Set<string>(),
          })
        }
        const pStats = byProductMap.get(pKey)!
        pStats.totalKg += item.quantity
        pStats.totalRevenue += item.subtotal
        pStats.totalSubsidy += item.product.subsidyPrice * item.quantity
        pStats.orderCount.add(order.id)

        // Warehouse kg/revenue/subsidy
        wh.totalKg += item.quantity
        wh.totalRevenue += item.subtotal
        wh.totalSubsidy += item.product.subsidyPrice * item.quantity

        // Farmer kg/subsidy
        fStats.totalKg += item.quantity

        // Daily kg/revenue
        if (daily) {
          daily.kg += item.quantity
          daily.revenue += item.subtotal
        }
      }
    }

    // Build byProduct array
    const byProduct = Array.from(byProductMap.values()).map((p) => ({
      productName: p.productName,
      productType: p.productType,
      totalKg: Math.round(p.totalKg),
      totalRevenue: Math.round(p.totalRevenue),
      totalSubsidy: Math.round(p.totalSubsidy),
      orderCount: p.orderCount.size,
      avgPricePerKg: p.totalKg > 0 ? Math.round(p.totalRevenue / p.totalKg) : 0,
    }))

    // Build byWarehouse array
    const byWarehouse = Array.from(byWarehouseMap.values()).map((w) => ({
      warehouseId: w.warehouseId,
      warehouseName: w.warehouseName,
      warehouseCode: w.warehouseCode,
      totalOrders: w.totalOrders,
      totalKg: Math.round(w.totalKg),
      totalRevenue: Math.round(w.totalRevenue),
      totalSubsidy: Math.round(w.totalSubsidy),
    }))

    // Build topFarmers array (sorted by totalKg descending)
    const topFarmers = Array.from(farmerMap.values())
      .sort((a, b) => b.totalKg - a.totalKg)
      .map((f) => ({
        farmerId: f.farmerId,
        farmerName: f.farmerName,
        farmerNik: f.farmerNik,
        totalOrders: f.totalOrders,
        totalKg: Math.round(f.totalKg),
        totalAmount: Math.round(f.totalAmount),
        totalSubsidy: Math.round(f.totalSubsidy),
      }))

    // Build dailySales array with all days
    const dailySalesResult = dailySales.map((d) => {
      const data = dailyMap.get(d.date)
      return {
        date: d.date,
        orders: data?.orders ?? 0,
        kg: Math.round(data?.kg ?? 0),
        revenue: Math.round(data?.revenue ?? 0),
      }
    })

    // Log activity (non-critical)
    try {
      await logActivity(
        'VIEW_MONTHLY_REPORT',
        `Melihat laporan bulanan ${INDONESIAN_MONTHS[month - 1]} ${year}`
      )
    } catch {
      // ignore
    }

    return NextResponse.json({
      period: {
        month,
        year,
        label: `${INDONESIAN_MONTHS[month - 1]} ${year}`,
      },
      summary: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        pendingOrders,
        totalKgSold: Math.round(totalKgSold),
        totalRevenue: Math.round(totalRevenue),
        totalSubsidy: Math.round(totalSubsidy),
        totalFarmersServed: farmerSet.size,
        uniqueProductsSold: productSet.size,
      },
      byProduct,
      byWarehouse,
      topFarmers,
      dailySales: dailySalesResult,
    })
  } catch (error) {
    console.error('Monthly report error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat laporan bulanan' },
      { status: 500 }
    )
  }
}