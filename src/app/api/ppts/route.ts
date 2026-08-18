import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WCM_ACTIVE_PPTS_DATA } from './seed/route'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const district = searchParams.get('district') || ''

    const where = {
      isActive: true,
      ...(district ? { district } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { district: { contains: search } },
              { address: { contains: search } },
              { ownerName: { contains: search } },
            ],
          }
        : {}),
    }

    const pptsList = await db.ppts.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const wcmMap = new Map(WCM_ACTIVE_PPTS_DATA.map((item) => [item.code, item]))

    const enrichedList = pptsList.map((item) => {
      const wcm = wcmMap.get(item.code)
      const alokUrea = item.alokasiUrea !== null && item.alokasiUrea !== undefined ? item.alokasiUrea : (wcm?.alokasiUrea ?? 0)
      const realUrea = item.realisasiUrea !== null && item.realisasiUrea !== undefined ? item.realisasiUrea : (wcm?.realisasiUrea ?? 0)
      const sisaUrea = item.sisaUrea !== null && item.sisaUrea !== undefined ? item.sisaUrea : Math.max(0, alokUrea - realUrea)

      const alokNpk = item.alokasiNpk !== null && item.alokasiNpk !== undefined ? item.alokasiNpk : (wcm?.alokasiNpk ?? 0)
      const realNpk = item.realisasiNpk !== null && item.realisasiNpk !== undefined ? item.realisasiNpk : (wcm?.realisasiNpk ?? 0)
      const sisaNpk = item.sisaNpk !== null && item.sisaNpk !== undefined ? item.sisaNpk : Math.max(0, alokNpk - realNpk)

      return {
        ...item,
        spjbNumber: item.spjbNumber || wcm?.spjbNumber || '',
        alokasiUrea: alokUrea,
        realisasiUrea: realUrea,
        sisaUrea: sisaUrea,
        alokasiNpk: alokNpk,
        realisasiNpk: realNpk,
        sisaNpk: sisaNpk,
      }
    })

    return NextResponse.json(enrichedList)
  } catch (error) {
    console.error('List PPTS error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat daftar PPTS' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      code, name, address, district, village, regency, province, ownerName, phone,
      spjbNumber, spjbDate, spjbValidFrom, spjbValidUntil, alokasiUrea, alokasiNpk
    } = body

    if (!code || !name || !address || !district) {
      return NextResponse.json(
        { error: 'No ID PPTS, Nama PPTS, Alamat, dan Kecamatan wajib diisi' },
        { status: 400 }
      )
    }

    const pptsData = {
      code,
      name,
      address,
      district,
      village: village || null,
      regency: regency || 'Kudus',
      province: province || 'Jawa Tengah',
      ownerName: ownerName || null,
      phone: phone || null,
      spjbNumber: spjbNumber || null,
      spjbDate: spjbDate || null,
      spjbValidFrom: spjbValidFrom || null,
      spjbValidUntil: spjbValidUntil || null,
      alokasiUrea: alokasiUrea !== undefined ? alokasiUrea : null,
      alokasiNpk: alokasiNpk !== undefined ? alokasiNpk : null,
    }

    const ppts = await db.ppts.upsert({
      where: { code },
      update: pptsData,
      create: pptsData,
    })

    return NextResponse.json(ppts, { status: 201 })
  } catch (error) {
    console.error('Create PPTS error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal menambahkan data PPTS' },
      { status: 500 }
    )
  }
}
