import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const body = await request.json()
    const {
      totalAllocationTon,
      janAlloc, febAlloc, marAlloc, aprAlloc, mayAlloc, junAlloc,
      julAlloc, augAlloc, sepAlloc, octAlloc, novAlloc, decAlloc
    } = body

    const existing = await db.allocation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Data alokasi tidak ditemukan' },
        { status: 404 }
      )
    }

    let newTotalAlloc = typeof totalAllocationTon === 'number' ? totalAllocationTon : existing.totalAllocationTon

    // Jika alokasi bulanan di-edit, total alokasi otomatis dijumlahkan dari jan..dec
    const hasMonthlyEdit = [janAlloc, febAlloc, marAlloc, aprAlloc, mayAlloc, junAlloc, julAlloc, augAlloc, sepAlloc, octAlloc, novAlloc, decAlloc].some(v => typeof v === 'number')

    const newJan = typeof janAlloc === 'number' ? janAlloc : existing.janAlloc
    const newFeb = typeof febAlloc === 'number' ? febAlloc : existing.febAlloc
    const newMar = typeof marAlloc === 'number' ? marAlloc : existing.marAlloc
    const newApr = typeof aprAlloc === 'number' ? aprAlloc : existing.aprAlloc
    const newMay = typeof mayAlloc === 'number' ? mayAlloc : existing.mayAlloc
    const newJun = typeof junAlloc === 'number' ? junAlloc : existing.junAlloc
    const newJul = typeof julAlloc === 'number' ? julAlloc : existing.julAlloc
    const newAug = typeof augAlloc === 'number' ? augAlloc : existing.augAlloc
    const newSep = typeof sepAlloc === 'number' ? sepAlloc : existing.sepAlloc
    const newOct = typeof octAlloc === 'number' ? octAlloc : existing.octAlloc
    const newNov = typeof novAlloc === 'number' ? novAlloc : existing.novAlloc
    const newDec = typeof decAlloc === 'number' ? decAlloc : existing.decAlloc

    if (hasMonthlyEdit) {
      newTotalAlloc = newJan + newFeb + newMar + newApr + newMay + newJun + newJul + newAug + newSep + newOct + newNov + newDec
    }

    const newRemaining = Math.max(0, newTotalAlloc - existing.totalRealizationTon)
    const newPct = newTotalAlloc > 0 ? (existing.totalRealizationTon / newTotalAlloc) * 100 : 0

    const updated = await db.allocation.update({
      where: { id },
      data: {
        totalAllocationTon: newTotalAlloc,
        totalRemainingTon: newRemaining,
        realizationPct: newPct,
        janAlloc: newJan,
        febAlloc: newFeb,
        marAlloc: newMar,
        aprAlloc: newApr,
        mayAlloc: newMay,
        junAlloc: newJun,
        julAlloc: newJul,
        augAlloc: newAug,
        sepAlloc: newSep,
        octAlloc: newOct,
        novAlloc: newNov,
        decAlloc: newDec,
        updatedAt: new Date(),
      },
    })

    // Jika tipe PPTS, selaraskan alokasi ke tabel Ppts
    if (existing.type === 'PPTS' && existing.pptsCode) {
      const isUrea = existing.productName.includes('UREA')
      await db.ppts.updateMany({
        where: { code: existing.pptsCode },
        data: isUrea
          ? { alokasiUrea: newTotalAlloc, sisaUrea: Math.max(0, newTotalAlloc - existing.totalRealizationTon) }
          : { alokasiNpk: newTotalAlloc, sisaNpk: Math.max(0, newTotalAlloc - existing.totalRealizationTon) },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Berhasil meng-update Alokasi Tahunan',
      data: updated,
    })
  } catch (error: any) {
    console.error('Error updating allocation:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengubah Alokasi', details: error.message },
      { status: 500 }
    )
  }
}
