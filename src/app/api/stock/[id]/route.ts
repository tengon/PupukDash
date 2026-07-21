import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.stock.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Data stok tidak ditemukan' },
        { status: 404 }
      )
    }

    await db.stock.delete({ where: { id } })

    return NextResponse.json({ message: 'Stok berhasil dihapus' })
  } catch (error) {
    console.error('Delete stock error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus stok' },
      { status: 500 }
    )
  }
}