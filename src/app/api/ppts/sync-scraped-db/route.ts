import { NextResponse } from 'next/server'
import { syncAnnualTotalToDb } from '@/lib/sync-annual-to-db'

export async function GET() {
  try {
    const result = await syncAnnualTotalToDb()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal menyinkronkan data alokasi ke DB', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const result = await syncAnnualTotalToDb()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal menyinkronkan data alokasi ke DB', details: error.message },
      { status: 500 }
    )
  }
}
