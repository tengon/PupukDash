import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ppts = await db.ppts.findUnique({
      where: { id },
    })

    if (!ppts || !ppts.isActive) {
      return NextResponse.json(
        { error: 'Data PPTS tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(ppts)
  } catch (error) {
    console.error('Get PPTS error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil detail PPTS' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, name, address, district, village, regency, province, ownerName, phone, isActive } = body

    const existing = await db.ppts.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Data PPTS tidak ditemukan' },
        { status: 404 }
      )
    }

    if (code && code !== existing.code) {
      const codeCheck = await db.ppts.findUnique({ where: { code } })
      if (codeCheck) {
        return NextResponse.json(
          { error: 'No ID PPTS sudah digunakan oleh kios lain' },
          { status: 400 }
        )
      }
    }

    const updated = await db.ppts.update({
      where: { id },
      data: {
        ...(code ? { code } : {}),
        ...(name ? { name } : {}),
        ...(address ? { address } : {}),
        ...(district ? { district } : {}),
        ...(village !== undefined ? { village } : {}),
        ...(regency !== undefined ? { regency } : {}),
        ...(province !== undefined ? { province } : {}),
        ...(ownerName !== undefined ? { ownerName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update PPTS error:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui data PPTS' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.ppts.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Data PPTS berhasil dihapus' })
  } catch (error) {
    console.error('Delete PPTS error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus data PPTS' },
      { status: 500 }
    )
  }
}
