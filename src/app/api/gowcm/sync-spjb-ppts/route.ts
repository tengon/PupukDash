import { NextResponse } from 'next/server'
import { syncSpjbPptsToDb } from '@/lib/sync-spjb-ppts-to-db'

export async function POST() {
  try {
    const result = await syncSpjbPptsToDb()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal sinkronisasi DB SPJB PPTS', details: error.message },
      { status: 500 }
    )
  }
}
