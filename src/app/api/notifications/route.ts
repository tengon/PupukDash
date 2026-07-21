import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const notifications: {
      id: string
      type: string
      title: string
      message: string
      icon: string
      color: string
      createdAt: Date
      action: { tab: string; filter?: string }
    }[] = []

    // 1. Stock alerts — stocks where quantity <= minStock
    const lowStocks = await db.stock.findMany({
      where: {
        quantity: { lte: db.stock.fields.minStock },
      },
      include: { product: true, warehouse: true },
    })

    for (const stock of lowStocks) {
      const ratio = stock.quantity / stock.minStock
      const color = ratio <= 0.5 ? 'red' : 'amber'
      const severity = ratio <= 0.5 ? 'Kritis' : 'Rendah'
      notifications.push({
        id: `stock-${stock.id}`,
        type: 'STOCK_ALERT',
        title: `Stok ${stock.product.name} ${severity}`,
        message: `Stok ${stock.product.name} di ${stock.warehouse.name} tinggal ${Math.round(stock.quantity)} kg (batas minimum: ${Math.round(stock.minStock)} kg)`,
        icon: 'alert-triangle',
        color,
        createdAt: stock.updatedAt,
        action: { tab: 'stock' },
      })
    }

    // 2. Pending orders summary
    const pendingOrders = await db.order.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 1,
    })

    const orderCounts = await db.order.groupBy({
      by: ['status'],
      _count: true,
    })

    const pendingCount = orderCounts.find((o) => o.status === 'PENDING')?._count ?? 0

    if (pendingCount > 0 && pendingOrders.length > 0) {
      const oldest = pendingOrders[0]
      const oldestDate = new Date(oldest.createdAt)
      const formattedDate = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(oldestDate)

      notifications.push({
        id: 'pending-orders-summary',
        type: 'PENDING_ORDER',
        title: `${pendingCount} Pesanan Menunggu Konfirmasi`,
        message: `Terdapat ${pendingCount} pesanan yang belum dikonfirmasi, tertua dari ${formattedDate}`,
        icon: 'clock',
        color: 'amber',
        createdAt: oldest.createdAt,
        action: { tab: 'orders', filter: 'PENDING' },
      })
    }

    // 3. Active distributions (IN_TRANSIT)
    const activeDistributions = await db.distribution.findMany({
      where: { status: 'IN_TRANSIT' },
      include: { warehouse: true },
    })

    for (const dist of activeDistributions) {
      notifications.push({
        id: `dist-${dist.id}`,
        type: 'DISTRIBUTION_IN_TRANSIT',
        title: `Distribusi ${dist.productName} Dalam Perjalanan`,
        message: `${Math.round(dist.quantity)} kg ${dist.productName} dari ${dist.warehouse.name} sedang dalam pengiriman`,
        icon: 'truck',
        color: 'teal',
        createdAt: dist.updatedAt,
        action: { tab: 'distributions' },
      })
    }

    // 4. Stock added recently (within last 24h) — highlight
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentStockUpdates = await db.stock.findMany({
      where: {
        lastRestocked: { gte: oneDayAgo },
      },
      include: { product: true, warehouse: true },
      orderBy: { lastRestocked: 'desc' },
      take: 3,
    })

    for (const stock of recentStockUpdates) {
      if (stock.lastRestocked) {
        notifications.push({
          id: `restock-${stock.id}`,
          type: 'STOCK_ADDED',
          title: `Stok ${stock.product.name} Ditambahkan`,
          message: `Gudang ${stock.warehouse.name}: ${Math.round(stock.quantity)} kg tersedia`,
          icon: 'package',
          color: 'green',
          createdAt: stock.lastRestocked,
          action: { tab: 'stock' },
        })
      }
    }

    // Sort by createdAt descending and limit to 10
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const limited = notifications.slice(0, 10)

    return NextResponse.json({
      notifications: limited.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Gagal memuat notifikasi' },
      { status: 500 },
    )
  }
}