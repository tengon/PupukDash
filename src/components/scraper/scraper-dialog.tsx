'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Bot,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Database,
  Calendar,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ScraperSyncResponse {
  success: boolean
  schedule: {
    interval: string
    times: string[]
    cron: string
  }
  isRunning: boolean
  lastSyncTime: string
  lastSyncStatus: 'SUCCESS' | 'FAILED' | null
  lastSyncMessage: string
  files: {
    spjb_operasional: string | null
    spjb_ppts: string | null
    penyaluran: string | null
    stok_kios_ipuber: string | null
  }
}

export function ScraperDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [progressValue, setProgressValue] = useState(10)

  const { data, isLoading, refetch } = useQuery<ScraperSyncResponse>({
    queryKey: ['scraper-sync-status'],
    queryFn: async () => {
      const res = await fetch('/api/scraper/sync')
      if (!res.ok) throw new Error('Gagal mengambil status scraper')
      return res.json()
    },
    enabled: open,
    refetchInterval: open ? 5000 : false,
  })

  useEffect(() => {
    let interval: NodeJS.Timeout
    const active = isSyncing || data?.isRunning
    if (active) {
      interval = setInterval(() => {
        setProgressValue((prev) => {
          if (prev < 35) return prev + 5
          if (prev < 75) return prev + 3
          if (prev < 96) return prev + 1
          return prev
        })
      }, 1500)
    } else {
      setProgressValue(100)
    }
    return () => clearInterval(interval)
  }, [isSyncing, data?.isRunning])

  const triggerSyncMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true)
      const res = await fetch('/api/scraper/sync', { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Gagal menjalankan sync')
      }
      return res.json()
    },
    onSuccess: (res) => {
      toast({
        title: 'Sync Scraper Berjalan',
        description: res.message || 'Proses scraping GOW CM sedang berjalan di background.',
      })
      refetch()
      queryClient.invalidateQueries()
      setTimeout(() => setIsSyncing(false), 3000)
    },
    onError: (err: Error) => {
      setIsSyncing(false)
      toast({
        title: 'Gagal Menjalankan Scraper',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Pengaturan Scraper GOW CM (Auto-Sync)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Jadwal sinkronisasi otomatis & status data scraping resmi Pupuk Indonesia
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 text-xs pt-1">
            {/* Box Jadwal Otomatis 6 Jam */}
            <div className="p-3 rounded-xl border bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Jadwal Auto-Sync Scraper</span>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold dark:bg-emerald-950/50">
                  Setiap 6 Jam
                </Badge>
              </div>

              <p className="text-muted-foreground text-[11px]">
                Scraper otomatis berjalan setiap 6 jam mulai dari jam 06:00 pagi:
              </p>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {['06:00 WIB (Pagi)', '12:00 WIB (Siang)', '18:00 WIB (Sore)', '00:00 WIB (Malam)'].map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] font-mono px-2 py-0.5 bg-background border">
                    <Zap className="h-2.5 w-2.5 text-amber-500 mr-1" />
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Progress Bar Status saat Running */}
            {(data?.isRunning || isSyncing) && (
              <div className="p-3.5 rounded-xl border bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <span>Progres Sinkronisasi Scraper GOW CM</span>
                  </div>
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                    {progressValue}%
                  </span>
                </div>

                <Progress value={progressValue} className="h-2.5 bg-muted/60" />

                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5 font-medium">
                  <span>
                    {progressValue < 25
                      ? 'Tahap 1/4: Scraping SPJB Operasional (PUD)...'
                      : progressValue < 55
                      ? 'Tahap 2/4: Scraping SPJB PPTS & Kios...'
                      : progressValue < 80
                      ? 'Tahap 3/4: Scraping Penyaluran GOW CM...'
                      : progressValue < 98
                      ? 'Tahap 4/4: Scraping Stok Kios iPuber...'
                      : 'Menyimpan & memperbarui database...'}
                  </span>
                  <span className="font-mono text-[10px] bg-background/80 px-1.5 py-0.5 rounded border">Est: ~3-4 min</span>
                </div>
              </div>
            )}

            {/* Status Sync Terakhir */}
            <div className="p-3 rounded-xl border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Status Scraper Terakhir:</span>
                {data?.isRunning || isSyncing ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 animate-pulse font-bold">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Sedang Running...
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                    Aktif / Ready
                  </Badge>
                )}
              </div>

              <div className="text-[11px] space-y-1 text-muted-foreground pt-1 border-t">
                <div className="flex justify-between">
                  <span>Update SPJB Operasional:</span>
                  <span className="font-mono font-semibold text-foreground">{data?.files?.spjb_operasional ? new Date(data.files.spjb_operasional).toLocaleString('id-ID') : 'Tersedia'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Update SPJB PPTS:</span>
                  <span className="font-mono font-semibold text-foreground">{data?.files?.spjb_ppts ? new Date(data.files.spjb_ppts).toLocaleString('id-ID') : 'Tersedia'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Update Penyaluran GOW CM:</span>
                  <span className="font-mono font-semibold text-foreground">{data?.files?.penyaluran ? new Date(data.files.penyaluran).toLocaleString('id-ID') : 'Tersedia'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Update Stok Kios iPuber:</span>
                  <span className="font-mono font-semibold text-foreground">{data?.files?.stok_kios_ipuber ? new Date(data.files.stok_kios_ipuber).toLocaleString('id-ID') : 'Tersedia'}</span>
                </div>
              </div>
            </div>

            {/* Tombol Jalankan Manual */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs text-muted-foreground"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Cek Status
              </Button>

              <Button
                size="sm"
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                disabled={data?.isRunning || isSyncing}
                onClick={() => triggerSyncMutation.mutate()}
              >
                <Sparkles className="h-4 w-4" />
                {data?.isRunning || isSyncing ? 'Sedang Sync...' : 'Jalankan Scraper Sekarang'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
