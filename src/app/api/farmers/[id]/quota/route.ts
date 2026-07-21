import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeProductType, getMaxQuantity } from '@/lib/het'

// Allocation per ha map for all known product types
const ALLOCATION_PER_HA: Record<string, number> = {
  UREA: 250,
  NPK: 300,
  'NPK Phonska': 300,
  'SP-36': 250,
  ZA: 150,
  ORGANIK: 500,
}

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
        name: true,
        nik: true,
        landAreaHa: true,
        farmerGroup: true,
      },
    })

    if (!farmer) {
      return NextResponse.json(
        { error: 'Petani tidak ditemukan' },
        { status: 404 }
      )
    }

    const landAreaHa = farmer.landAreaHa ?? 0

    // Get current year for filtering orders
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear + 1, 0, 1)

    // Fetch all order items for this farmer in the current year
    const orderItems = await db.orderItem.findMany({
      where: {
        order: {
          farmerId: id,
          createdAt: {
            gte: yearStart,
            lt: yearEnd,
          },
        },
      },
      include: {
        product: {
          select: { name: true, type: true },
        },
      },
    })

    // Aggregate used quantity by normalized product type
    // For quota purposes, group NPK variants together
    const usedByType: Record<string, number> = {}
    for (const item of orderItems) {
      let normalizedType = normalizeProductType(item.product.type || item.product.name)
      // Group all NPK variants under "NPK" for quota allocation
      if (normalizedType === 'NPK Phonska') normalizedType = 'NPK'
      usedByType[normalizedType] = (usedByType[normalizedType] || 0) + item.quantity
    }

    // Build quotas for all known product types (no duplicate NPK Phonska)
    const productTypes = ['UREA', 'NPK', 'SP-36', 'ZA', 'ORGANIK']
    const quotas = productTypes.map((type) => {
      const allocationPerHa = ALLOCATION_PER_HA[type]
      const maxQuantityKg = landAreaHa > 0 ? Math.floor(landAreaHa * allocationPerHa) : 0
      const usedQuantityKg = Math.round(usedByType[type] || 0)
      const remainingKg = Math.max(maxQuantityKg - usedQuantityKg, 0)
      const utilizationPercent = maxQuantityKg > 0
        ? Math.round((usedQuantityKg / maxQuantityKg) * 100 * 100) / 100
        : 0

      return {
        productType: type,
        maxQuantityKg,
        usedQuantityKg,
        remainingKg,
        utilizationPercent,
      }
    })

    return NextResponse.json({
      farmer: {
        name: farmer.name,
        nik: farmer.nik,
        landAreaHa: farmer.landAreaHa,
        farmerGroup: farmer.farmerGroup,
      },
      quotas,
    })
  } catch (error) {
    console.error('Farmer quota error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat kuota pupuk petani' },
      { status: 500 }
    )
  }
}