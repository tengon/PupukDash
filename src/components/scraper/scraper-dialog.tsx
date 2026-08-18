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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bot,
  RefreshCw,
  Clock,
  CheckCircle2,
  Sparkles,
  Zap,
  Save,
  Building2,
  Store,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ScraperScheduleItem {
  enabled: boolean
  startTime: string
  intervalHours: number
  lastRun: string | null
}

interface ScheduleSettings {
  spjb_operasional: ScraperScheduleItem
  spjb_ppts: ScraperScheduleItem
}

const INTERVAL_OPTIONS = [
  { value: '1', label: 'Setiap 1 Jam' },
  { value: '2', label: 'Setiap 2 Jam' },
  { value: '3', label: 'Setiap 3 Jam' },
  { value: '6', label: 'Setiap 6 Jam' },
  { value: '12', label: 'Setiap 12 Jam' },
  { value: '24', label: 'Setiap 24 Jam' },
]

export function ScraperDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'operasional' | 'ppts'>('operasional')

  // Local settings state
  const [opEnabled, setOpEnabled] = useState(true)
  const [opStartTime, setOpStartTime] = useState('06:00')
  const [opInterval, setOpInterval] = useState('6')

  const [pptsEnabled, setPptsEnabled] = useState(true)
  const [pptsStartTime, setPptsStartTime] = useState('06:00')
  const [pptsInterval, setPptsInterval] = useState('6')

  const [isSyncingOp, setIsSyncingOp] = useState(false)
  const [isSyncingPpts, setIsSyncingPpts] = useState(false)

  // Fetch current schedule settings
  const { data: scheduleData, isLoading, refetch } = useQuery<{ success: boolean; settings: ScheduleSettings }>({
    queryKey: ['scraper-schedule-settings'],
    queryFn: async () => {
      const res = await fetch('/api/scraper/schedule')
      if (!res.ok) throw new Error('Gagal mengambil jadwal scraper')
      return res.json()
    },
    enabled: open,
  })

  useEffect(() => {
    if (scheduleData?.settings) {
      const s = scheduleData.settings
      if (s.spjb_operasional) {
        setOpEnabled(s.spjb_operasional.enabled ?? true)
        setOpStartTime(s.spjb_operasional.startTime || '06:00')
        setOpInterval(String(s.spjb_operasional.intervalHours || 6))
      }
      if (s.spjb_ppts) {
        setPptsEnabled(s.spjb_ppts.enabled ?? true)
        setPptsStartTime(s.spjb_ppts.startTime || '06:00')
        setPptsInterval(String(s.spjb_ppts.intervalHours || 6))
      }
    }
  }, [scheduleData])

  // Save Schedule Mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        spjb_operasional: {
          enabled: opEnabled,
          startTime: opStartTime,
          intervalHours: parseInt(opInterval) || 6,
        },
        spjb_ppts: {
          enabled: pptsEnabled,
          startTime: pptsStartTime,
          intervalHours: parseInt(pptsInterval) || 6,
        },
      }

      const res = await fetch('/api/scraper/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal menyimpan jadwal')
      return res.json()
    },
    onSuccess: (res) => {
      toast({
        title: 'Jadwal Disimpan',
        description: res.message || 'Pengaturan jam & interval scraper berhasil diperbarui.',
      })
      refetch()
    },
    onError: (err: Error) => {
      toast({
        title: 'Gagal Menyimpan',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  // Manual Trigger SPJB Operasional
  const triggerOpSync = async () => {
    setIsSyncingOp(true)
    try {
      const res = await fetch('/api/gowcm/sync-spjb-operasional', { method: 'POST' })
      const json = await res.json()
      toast({
        title: 'Sync SPJB Operasional Selesai',
        description: json.message || `Total ${json.updatedAllocationCount || 0} record alokasi ter-update ke DB.`,
      })
      queryClient.invalidateQueries()
    } catch (e: any) {
      toast({
        title: 'Sync Gagal',
        description: e.message || 'Terjadi kesalahan saat sync DB Operasional',
        variant: 'destructive',
      })
    } finally {
      setIsSyncingOp(false)
    }
  }

  // Manual Trigger SPJB PPTS
  const triggerPptsSync = async () => {
    setIsSyncingPpts(true)
    try {
      const res = await fetch('/api/gowcm/sync-spjb-ppts', { method: 'POST' })
      const json = await res.json()
      toast({
        title: 'Sync SPJB PPTS Selesai',
        description: json.message || `Total ${json.updatedPptsCount || 0} Kios PPTS ter-update ke DB.`,
      })
      queryClient.invalidateQueries()
    } catch (e: any) {
      toast({
        title: 'Sync Gagal',
        description: e.message || 'Terjadi kesalahan saat sync DB PPTS',
        variant: 'destructive',
      })
    } finally {
      setIsSyncingPpts(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Pengaturan Jadwal Scraper GOW CM
          </DialogTitle>
          <DialogDescription className="text-xs">
            Atur jam mulai eksekusi & durasi pengulangan (interval) secara mandiri untuk SPJB Operasional & SPJB PPTS
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 text-xs pt-1">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'operasional' | 'ppts')} className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="operasional" className="gap-1.5 text-xs font-bold">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  SPJB Operasional (PUD)
                </TabsTrigger>
                <TabsTrigger value="ppts" className="gap-1.5 text-xs font-bold">
                  <Store className="h-3.5 w-3.5 text-blue-600" />
                  SPJB PPTS (Kios)
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: SPJB OPERASIONAL */}
              <TabsContent value="operasional" className="space-y-3 pt-3">
                <div className="p-3.5 rounded-xl border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        Status Auto-Sync SPJB Operasional
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Aktifkan pengulangan otomatis berbasis jam & durasi</p>
                    </div>
                    <Switch checked={opEnabled} onCheckedChange={setOpEnabled} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-emerald-600" />
                        Jam Mulai Eksekusi
                      </Label>
                      <Input
                        type="time"
                        value={opStartTime}
                        onChange={(e) => setOpStartTime(e.target.value)}
                        className="h-8 text-xs font-mono"
                        disabled={!opEnabled}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        Durasi / Interval Pengulangan
                      </Label>
                      <Select value={opInterval} onValueChange={setOpInterval} disabled={!opEnabled}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Pilih Interval" />
                        </SelectTrigger>
                        <SelectContent>
                          {INTERVAL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {scheduleData?.settings?.spjb_operasional?.lastRun && (
                    <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between border-t border-dashed">
                      <span>Eksekusi Terakhir:</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                        {new Date(scheduleData.settings.spjb_operasional.lastRun).toLocaleString('id-ID')}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                    disabled={isSyncingOp}
                    onClick={triggerOpSync}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingOp ? 'animate-spin' : ''}`} />
                    {isSyncingOp ? 'Syncing...' : 'Sync DB Operasional Sekarang'}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 2: SPJB PPTS */}
              <TabsContent value="ppts" className="space-y-3 pt-3">
                <div className="p-3.5 rounded-xl border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        Status Auto-Sync SPJB PPTS
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Aktifkan pengulangan otomatis berbasis jam & durasi</p>
                    </div>
                    <Switch checked={pptsEnabled} onCheckedChange={setPptsEnabled} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-600" />
                        Jam Mulai Eksekusi
                      </Label>
                      <Input
                        type="time"
                        value={pptsStartTime}
                        onChange={(e) => setPptsStartTime(e.target.value)}
                        className="h-8 text-xs font-mono"
                        disabled={!pptsEnabled}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        Durasi / Interval Pengulangan
                      </Label>
                      <Select value={pptsInterval} onValueChange={setPptsInterval} disabled={!pptsEnabled}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Pilih Interval" />
                        </SelectTrigger>
                        <SelectContent>
                          {INTERVAL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {scheduleData?.settings?.spjb_ppts?.lastRun && (
                    <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between border-t border-dashed">
                      <span>Eksekusi Terakhir:</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                        {new Date(scheduleData.settings.spjb_ppts.lastRun).toLocaleString('id-ID')}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                    disabled={isSyncingPpts}
                    onClick={triggerPptsSync}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingPpts ? 'animate-spin' : ''}`} />
                    {isSyncingPpts ? 'Syncing...' : 'Sync DB PPTS Sekarang'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between border-t gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs text-muted-foreground"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Status
              </Button>

              <Button
                size="sm"
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                disabled={saveScheduleMutation.isPending}
                onClick={() => saveScheduleMutation.mutate()}
              >
                <Save className="h-4 w-4" />
                {saveScheduleMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan Jadwal'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

