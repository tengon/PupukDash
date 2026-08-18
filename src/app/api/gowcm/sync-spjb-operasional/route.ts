import { NextResponse } from 'next/server'
import { syncSpjbOperasionalToDb } from '@/lib/sync-spjb-operasional-to-db'

export async function POST() {
  try {
    const result = await syncSpjbOperasionalToDb()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal sinkronisasi DB SPJB Operasional', details: error.message },
      { status: 500 }
    )
  }
}
