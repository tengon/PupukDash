import { syncSpjbPptsToDb } from '@/lib/sync-spjb-ppts-to-db'
import { syncSpjbOperasionalToDb } from '@/lib/sync-spjb-operasional-to-db'

export async function syncAnnualTotalToDb() {
  console.log('🔄 Memulai sinkronisasi terpisah: SPJB PPTS & SPJB Operasional...')
  
  const pptsResult = await syncSpjbPptsToDb()
  const opResult = await syncSpjbOperasionalToDb()

  return {
    success: pptsResult.success && opResult.success,
    ppts: pptsResult,
    operasional: opResult,
    syncedAt: new Date().toISOString(),
  }
}
