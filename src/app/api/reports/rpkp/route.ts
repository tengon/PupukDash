import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@/lib/db'
import { HET_PRICES, normalizeProductType } from '@/lib/het'

// Alokasi maksimal per hektar berdasarkan jenis pupuk (kg/ha)
const ALLOCATION_PER_HA: Record<string, number> = {
  UREA: 250,
  NPK: 300,
  'SP-36': 250,
  ZA: 150,
  ORGANIK: 500,
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    // Get all active farmers with their land area
    const farmers = await db.farmer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, landAreaHa: true },
    })

    const totalFarmers = farmers.length
    const totalLandAreaHa = farmers.reduce((sum, f) => sum + (f.landAreaHa || 0), 0)

    // Get all order items for the given year (excluding cancelled orders)
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

    const orderItems = await db.orderItem.findMany({
      where: {
        order: {
          status: { not: 'CANCELLED' },
          createdAt: { gte: yearStart, lte: yearEnd },
        },
      },
      include: {
        product: { select: { name: true, type: true, subsidyPrice: true } },
      },
    })

    // Group actual sales by normalized product type
    const soldByType: Record<string, { kg: number; subsidyValue: number }> = {}
    for (const item of orderItems) {
      const typeName = normalizeProductType(item.product.name)
      if (!soldByType[typeName]) {
        soldByType[typeName] = { kg: 0, subsidyValue: 0 }
      }
      soldByType[typeName].kg += item.quantity
      soldByType[typeName].subsidyValue += item.product.subsidyPrice * item.quantity
    }

    // Build product list for all known fertilizer types
    const productTypes = ['UREA', 'NPK', 'SP-36', 'ZA', 'ORGANIK']
    const products = productTypes.map((pt) => {
      const allocationPerHa = ALLOCATION_PER_HA[pt] || 0
      const totalAllocationKg = Math.round(totalLandAreaHa * allocationPerHa)
      const actual = soldByType[pt] || { kg: 0, subsidyValue: 0 }
      const actualSoldKg = Math.round(actual.kg)
      const remainingKg = totalAllocationKg - actualSoldKg
      const utilizationPercent = totalAllocationKg > 0
        ? Math.round((actualSoldKg / totalAllocationKg) * 1000) / 10
        : 0
      const hetPrice = HET_PRICES[pt] || 0
      const totalSubsidyValue = Math.round(actual.subsidyValue)

      return {
        productType: pt,
        allocationPerHa,
        totalAllocationKg,
        actualSoldKg,
        remainingKg,
        utilizationPercent,
        hetPrice,
        totalSubsidyValue,
      }
    })

    // Summary totals
    const totalAllocationKg = products.reduce((s, p) => s + p.totalAllocationKg, 0)
    const totalSoldKg = products.reduce((s, p) => s + p.actualSoldKg, 0)
    const totalRemainingKg = products.reduce((s, p) => s + p.remainingKg, 0)
    const overallUtilizationPercent = totalAllocationKg > 0
      ? Math.round((totalSoldKg / totalAllocationKg) * 1000) / 10
      : 0
    const totalSubsidyValue = products.reduce((s, p) => s + p.totalSubsidyValue, 0)

    // Log activity (non-critical)
    try {
      await logActivity(
        'VIEW_RPKP',
        `Melihat laporan RPKP tahun ${year}`
      )
    } catch {
      // ignore
    }

    return NextResponse.json({
      year,
      totalLandAreaHa: Math.round(totalLandAreaHa * 100) / 100,
      totalFarmers,
      products,
      summary: {
        totalAllocationKg,
        totalSoldKg,
        totalRemainingKg,
        overallUtilizationPercent,
        totalSubsidyValue,
      },
    })
  } catch (error) {
    console.error('RPKP report error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat laporan RPKP' },
      { status: 500 }
    )
  }
}