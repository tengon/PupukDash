'use client'

import { Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'

async function fetchDashboardAlerts(): Promise<{ stockAlerts: { count: number } }> {
  const res = await fetch('/api/dashboard')
  if (!res.ok) throw new Error('Gagal memuat data')
  const data = await res.json()
  return { stockAlerts: { count: (data.stockAlerts || []).length } }
}

export function NotificationBell() {
  const { setActiveTab, refreshKey } = useAppStore()

  const { data } = useQuery({
    queryKey: ['notification-alerts', refreshKey],
    queryFn: fetchDashboardAlerts,
    refetchInterval: 60_000,
  })

  const alertCount = data?.stockAlerts?.count ?? 0

  return (
    <button
      onClick={() => setActiveTab('dashboard')}
      className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
      title={alertCount > 0 ? `${alertCount} peringatan stok` : 'Tidak ada notifikasi'}
    >
      <Bell className={`h-4 w-4 ${alertCount > 0 ? 'text-primary bell-pulse-green' : 'text-muted-foreground'}`} />
      {alertCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
          {alertCount > 9 ? '9+' : alertCount}
        </span>
      )}
    </button>
  )
}