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
  Zap,
  Save,
  Building2,
  Store,
  Boxes,
  Truck,
  Filter,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ScraperScheduleItem {
  enabled: boolean
  startTime: string
  intervalHours: number
  scrapeRange?: string
  lastRun: string | null
}

interface ScheduleSettings {
  spjb_operasional: ScraperScheduleItem
  spjb_ppts: ScraperScheduleItem
  realisasi_stok_kios: ScraperScheduleItem
  penyaluran_pengecer: ScraperScheduleItem
  detail_surat_jalan: ScraperScheduleItem
}

const INTERVAL_OPTIONS = [
  { value: '1', label: 'Setiap 1 Jam' },
  { value: '2', label: 'Setiap 2 Jam' },
  { value: '3', label: 'Setiap 3 Jam' },
  { value: '6', label: 'Setiap 6 Jam' },
  { value: '12', label: 'Setiap 12 Jam' },
  { value: '24', label: 'Setiap 24 Jam' },
]

const SCRAPE_RANGE_OPTIONS = [
  { value: 'today', label: '⚡ Hari Ini Sahaja (Sangat Cepat)' },
  { value: '7days', label: '📅 7 Hari Terakhir' },
  { value: '1month', label: '🗓️ 1 Bulan Terakhir' },
  { value: 'all', label: '🌐 Semua Data (Seluruh Halaman)' },
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
  const [activeTab, setActiveTab] = useState<'operasional' | 'ppts' | 'realisasi' | 'distribusi' | 'detail_sj'>('operasional')

  // Local settings state
  const [opEnabled, setOpEnabled] = useState(true)
  const [opStartTime, setOpStartTime] = useState('06:00')
  const [opInterval, setOpInterval] = useState('6')
  const [opScrapeRange, setOpScrapeRange] = useState<string>('all')

  const [pptsEnabled, setPptsEnabled] = useState(true)
  const [pptsStartTime, setPptsStartTime] = useState('06:00')
  const [pptsInterval, setPptsInterval] = useState('6')
  const [pptsScrapeRange, setPptsScrapeRange] = useState<string>('all')

  const [realisasiEnabled, setRealisasiEnabled] = useState(true)
  const [realisasiStartTime, setRealisasiStartTime] = useState('06:00')
  const [realisasiInterval, setRealisasiInterval] = useState('6')
  const [realisasiScrapeRange, setRealisasiScrapeRange] = useState<string>('all')

  const [distribusiEnabled, setDistribusiEnabled] = useState(true)
  const [distribusiStartTime, setDistribusiStartTime] = useState('06:00')
  const [distribusiInterval, setDistribusiInterval] = useState('6')
  const [distribusiScrapeRange, setDistribusiScrapeRange] = useState<string>('today')

  const [detailSjEnabled, setDetailSjEnabled] = useState(true)
  const [detailSjStartTime, setDetailSjStartTime] = useState('06:00')
  const [detailSjInterval, setDetailSjInterval] = useState('6')
  const [detailSjScrapeRange, setDetailSjScrapeRange] = useState<string>('today')

  const [isSyncingOp, setIsSyncingOp] = useState(false)
  const [isSyncingPpts, setIsSyncingPpts] = useState(false)
  const [isSyncingRealisasi, setIsSyncingRealisasi] = useState(false)
  const [isSyncingDistribusi, setIsSyncingDistribusi] = useState(false)
  const [isSyncingDetailSj, setIsSyncingDetailSj] = useState(false)

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
        setOpScrapeRange(s.spjb_operasional.scrapeRange || 'all')
      }
      if (s.spjb_ppts) {
        setPptsEnabled(s.spjb_ppts.enabled ?? true)
        setPptsStartTime(s.spjb_ppts.startTime || '06:00')
        setPptsInterval(String(s.spjb_ppts.intervalHours || 6))
        setPptsScrapeRange(s.spjb_ppts.scrapeRange || 'all')
      }
      if (s.realisasi_stok_kios) {
        setRealisasiEnabled(s.realisasi_stok_kios.enabled ?? true)
        setRealisasiStartTime(s.realisasi_stok_kios.startTime || '06:00')
        setRealisasiInterval(String(s.realisasi_stok_kios.intervalHours || 6))
        setRealisasiScrapeRange(s.realisasi_stok_kios.scrapeRange || 'all')
      }
      if (s.penyaluran_pengecer) {
        setDistribusiEnabled(s.penyaluran_pengecer.enabled ?? true)
        setDistribusiStartTime(s.penyaluran_pengecer.startTime || '06:00')
        setDistribusiInterval(String(s.penyaluran_pengecer.intervalHours || 6))
        setDistribusiScrapeRange(s.penyaluran_pengecer.scrapeRange || 'today')
      }
      if (s.detail_surat_jalan) {
        setDetailSjEnabled(s.detail_surat_jalan.enabled ?? true)
        setDetailSjStartTime(s.detail_surat_jalan.startTime || '06:00')
        setDetailSjInterval(String(s.detail_surat_jalan.intervalHours || 6))
        setDetailSjScrapeRange(s.detail_surat_jalan.scrapeRange || 'today')
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
          scrapeRange: opScrapeRange,
        },
        spjb_ppts: {
          enabled: pptsEnabled,
          startTime: pptsStartTime,
          intervalHours: parseInt(pptsInterval) || 6,
          scrapeRange: pptsScrapeRange,
        },
        realisasi_stok_kios: {
          enabled: realisasiEnabled,
          startTime: realisasiStartTime,
          intervalHours: parseInt(realisasiInterval) || 6,
          scrapeRange: realisasiScrapeRange,
        },
        penyaluran_pengecer: {
          enabled: distribusiEnabled,
          startTime: distribusiStartTime,
          intervalHours: parseInt(distribusiInterval) || 6,
          scrapeRange: distribusiScrapeRange,
        },
        detail_surat_jalan: {
          enabled: detailSjEnabled,
          startTime: detailSjStartTime,
          intervalHours: parseInt(detailSjInterval) || 6,
          scrapeRange: detailSjScrapeRange,
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
        title: 'Pengaturan Disimpan',
        description: res.message || 'Jadwal otomatis scraper GOW CM berhasil diperbarui.',
      })
      refetch()
    },
    onError: (err: any) => {
      toast({
        title: 'Gagal Menyimpan',
        description: err.message || 'Terjadi kesalahan saat menyimpan pengaturan jadwal.',
        variant: 'destructive',
      })
    },
  })

  // Manual Trigger SPJB Operasional
  const triggerOpSync = async () => {
    setIsSyncingOp(true)
    try {
      const res = await fetch(`/api/gowcm/sync-spjb-operasional?range=${opScrapeRange}`, { method: 'POST' })
      const json = await res.json()
      toast({
        title: 'Sync SPJB Operasional Selesai',
        description: json.message || 'Data SPJB Operasional berhasil di-scrape & dimasukkan ke DB.',
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
      const res = await fetch(`/api/gowcm/sync-spjb-ppts?range=${pptsScrapeRange}`, { method: 'POST' })
      const json = await res.json()
      toast({
        title: 'Sync SPJB PPTS Selesai',
        description: json.message || 'Data SPJB PPTS berhasil di-scrape & dimasukkan ke DB.',
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

  // Manual Trigger Realisasi Stok Kios
  const triggerRealisasiSync = async () => {
    setIsSyncingRealisasi(true)
    try {
      const res = await fetch(`/api/gowcm/sync-realisasi-stok-kios?range=${realisasiScrapeRange}`, { method: 'POST' })
      const json = await res.json()
      toast({
        title: 'Sync Realisasi Stok Kios Selesai',
        description: json.message || 'Scraping Realisasi Stok Kios IPubers berhasil di-scrape & dimasukkan ke DB.',
      })
      queryClient.invalidateQueries()
    } catch (e: any) {
      toast({
        title: 'Sync Gagal',
        description: e.message || 'Terjadi kesalahan saat sync Realisasi Stok Kios',
        variant: 'destructive',
      })
    } finally {
      setIsSyncingRealisasi(false)
    }
  }

  // Manual Trigger Penyaluran Pengecer (Distribusi)
  const triggerDistribusiSync = async () => {
    setIsSyncingDistribusi(true)
    try {
      const res = await fetch(`/api/gowcm/sync-penyaluran-pengecer?range=${distribusiScrapeRange}`, { method: 'POST' })
      const json = await res.json()
      toast({
        title: 'Sync Penyaluran Pengecer Selesai',
        description: json.message || 'Scraping Surat Jalan Penyaluran Pengecer berhasil di-scrape & dimasukkan ke DB.',
      })
      queryClient.invalidateQueries()
    } catch (e: any) {
      toast({
        title: 'Sync Gagal',
        description: e.message || 'Terjadi kesalahan saat sync Penyaluran Pengecer',
        variant: 'destructive',
      })
    } finally {
      setIsSyncingDistribusi(false)
    }
  }

  // Manual Trigger Detail Surat Jalan
  const triggerDetailSjSync = async () => {
    setIsSyncingDetailSj(true)
    try {
      const res = await fetch(`/api/gowcm/sync-detail-surat-jalan?range=${detailSjScrapeRange}`, { method: 'POST' })
      const json = await res.json()
      toast({
        title: 'Sync Detail Surat Jalan Selesai',
        description: json.message || 'Scraping Rincian Item Detail Surat Jalan berhasil di-scrape & dimasukkan ke DB.',
      })
      queryClient.invalidateQueries()
    } catch (e: any) {
      toast({
        title: 'Sync Gagal',
        description: e.message || 'Terjadi kesalahan saat sync Detail Surat Jalan',
        variant: 'destructive',
      })
    } finally {
      setIsSyncingDetailSj(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Penjadwalan Scraper Automatic GOW CM
          </DialogTitle>
          <DialogDescription className="text-xs">
            Atur status aktif, rentang data, jam mulai eksekusi & durasi pengulangan secara mandiri untuk seluruh modul scraper GOW CM
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 text-xs pt-1">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="operasional" className="gap-1 text-[10px] font-bold truncate px-1">
                  <Building2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span className="truncate">Operasional</span>
                </TabsTrigger>
                <TabsTrigger value="ppts" className="gap-1 text-[10px] font-bold truncate px-1">
                  <Store className="h-3 w-3 text-blue-600 shrink-0" />
                  <span className="truncate">PPTS</span>
                </TabsTrigger>
                <TabsTrigger value="realisasi" className="gap-1 text-[10px] font-bold truncate px-1">
                  <Boxes className="h-3 w-3 text-purple-600 shrink-0" />
                  <span className="truncate">Stok Kios</span>
                </TabsTrigger>
                <TabsTrigger value="distribusi" className="gap-1 text-[10px] font-bold truncate px-1">
                  <Truck className="h-3 w-3 text-sky-600 shrink-0" />
                  <span className="truncate">Distribusi</span>
                </TabsTrigger>
                <TabsTrigger value="detail_sj" className="gap-1 text-[10px] font-bold truncate px-1">
                  <FileText className="h-3 w-3 text-amber-600 shrink-0" />
                  <span className="truncate">Detail SJ</span>
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
                        Interval Pengulangan
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

                  {/* Opsi Filter Rentang Data Scraper */}
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3 text-emerald-600" />
                      Rentang Data yang Di-Scrape (Limit Tanggal)
                    </Label>
                    <Select value={opScrapeRange} onValueChange={setOpScrapeRange}>
                      <SelectTrigger className="h-8 text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        <SelectValue placeholder="Pilih Rentang Data" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCRAPE_RANGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Pilih 'Hari Ini' atau '7 Hari' agar proses scraping berjalan sangat cepat dalam hitungan detik.
                    </p>
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
                    {isSyncingOp ? 'Syncing...' : `Run Scraper Operasional (${opScrapeRange.toUpperCase()}) Sekarang`}
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
                        Interval Pengulangan
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

                  {/* Opsi Filter Rentang Data Scraper */}
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3 text-blue-600" />
                      Rentang Data yang Di-Scrape (Limit Tanggal)
                    </Label>
                    <Select value={pptsScrapeRange} onValueChange={setPptsScrapeRange}>
                      <SelectTrigger className="h-8 text-xs font-bold text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        <SelectValue placeholder="Pilih Rentang Data" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCRAPE_RANGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Pilih 'Hari Ini' atau '7 Hari' agar proses scraping berjalan sangat cepat dalam hitungan detik.
                    </p>
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
                    {isSyncingPpts ? 'Syncing...' : `Run Scraper PPTS (${pptsScrapeRange.toUpperCase()}) Sekarang`}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 3: REALISASI STOK KIOS */}
              <TabsContent value="realisasi" className="space-y-3 pt-3">
                <div className="p-3.5 rounded-xl border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        Status Auto-Sync Realisasi Stok Kios
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Aktifkan pengulangan otomatis scraping stok kios IPubers</p>
                    </div>
                    <Switch checked={realisasiEnabled} onCheckedChange={setRealisasiEnabled} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-purple-600" />
                        Jam Mulai Eksekusi
                      </Label>
                      <Input
                        type="time"
                        value={realisasiStartTime}
                        onChange={(e) => setRealisasiStartTime(e.target.value)}
                        className="h-8 text-xs font-mono"
                        disabled={!realisasiEnabled}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        Interval Pengulangan
                      </Label>
                      <Select value={realisasiInterval} onValueChange={setRealisasiInterval} disabled={!realisasiEnabled}>
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

                  {/* Opsi Filter Rentang Data Scraper */}
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3 text-purple-600" />
                      Rentang Data yang Di-Scrape (Limit Tanggal)
                    </Label>
                    <Select value={realisasiScrapeRange} onValueChange={setRealisasiScrapeRange}>
                      <SelectTrigger className="h-8 text-xs font-bold text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                        <SelectValue placeholder="Pilih Rentang Data" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCRAPE_RANGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Pilih 'Hari Ini' atau '7 Hari' agar proses scraping berjalan sangat cepat dalam hitungan detik.
                    </p>
                  </div>

                  {scheduleData?.settings?.realisasi_stok_kios?.lastRun && (
                    <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between border-t border-dashed">
                      <span>Eksekusi Terakhir:</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                        {new Date(scheduleData.settings.realisasi_stok_kios.lastRun).toLocaleString('id-ID')}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50"
                    disabled={isSyncingRealisasi}
                    onClick={triggerRealisasiSync}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingRealisasi ? 'animate-spin' : ''}`} />
                    {isSyncingRealisasi ? 'Syncing...' : `Run Scraper Realisasi (${realisasiScrapeRange.toUpperCase()}) Sekarang`}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 4: MONITORING DISTRIBUSI (PENYALURAN PENGECER) */}
              <TabsContent value="distribusi" className="space-y-3 pt-3">
                <div className="p-3.5 rounded-xl border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        Status Auto-Sync Monitoring Distribusi
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Aktifkan pengulangan otomatis scraping Surat Jalan Penyaluran ke Pengecer</p>
                    </div>
                    <Switch checked={distribusiEnabled} onCheckedChange={setDistribusiEnabled} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-sky-600" />
                        Jam Mulai Eksekusi
                      </Label>
                      <Input
                        type="time"
                        value={distribusiStartTime}
                        onChange={(e) => setDistribusiStartTime(e.target.value)}
                        className="h-8 text-xs font-mono"
                        disabled={!distribusiEnabled}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        Interval Pengulangan
                      </Label>
                      <Select value={distribusiInterval} onValueChange={setDistribusiInterval} disabled={!distribusiEnabled}>
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

                  {/* Opsi Filter Rentang Data Scraper */}
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3 text-sky-600" />
                      Rentang Data yang Di-Scrape (Limit Tanggal)
                    </Label>
                    <Select value={distribusiScrapeRange} onValueChange={setDistribusiScrapeRange}>
                      <SelectTrigger className="h-8 text-xs font-bold text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800">
                        <SelectValue placeholder="Pilih Rentang Data" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCRAPE_RANGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {scheduleData?.settings?.penyaluran_pengecer?.lastRun && (
                    <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between border-t border-dashed">
                      <span>Eksekusi Terakhir:</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                        {new Date(scheduleData.settings.penyaluran_pengecer.lastRun).toLocaleString('id-ID')}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-50"
                    disabled={isSyncingDistribusi}
                    onClick={triggerDistribusiSync}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingDistribusi ? 'animate-spin' : ''}`} />
                    {isSyncingDistribusi ? 'Syncing...' : `Run Scraper (${distribusiScrapeRange.toUpperCase()}) Sekarang`}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 5: DETAIL SURAT JALAN */}
              <TabsContent value="detail_sj" className="space-y-3 pt-3">
                <div className="p-3.5 rounded-xl border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        Status Auto-Sync Detail Surat Jalan
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Aktifkan pengulangan otomatis scraping Rincian Item Detail Surat Jalan</p>
                    </div>
                    <Switch checked={detailSjEnabled} onCheckedChange={setDetailSjEnabled} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-600" />
                        Jam Mulai Eksekusi
                      </Label>
                      <Input
                        type="time"
                        value={detailSjStartTime}
                        onChange={(e) => setDetailSjStartTime(e.target.value)}
                        className="h-8 text-xs font-mono"
                        disabled={!detailSjEnabled}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        Interval Pengulangan
                      </Label>
                      <Select value={detailSjInterval} onValueChange={setDetailSjInterval} disabled={!detailSjEnabled}>
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

                  {/* Opsi Filter Rentang Data Scraper */}
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Filter className="h-3 w-3 text-amber-600" />
                      Rentang Data yang Di-Scrape (Limit Tanggal)
                    </Label>
                    <Select value={detailSjScrapeRange} onValueChange={setDetailSjScrapeRange}>
                      <SelectTrigger className="h-8 text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                        <SelectValue placeholder="Pilih Rentang Data" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCRAPE_RANGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {scheduleData?.settings?.detail_surat_jalan?.lastRun && (
                    <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between border-t border-dashed">
                      <span>Eksekusi Terakhir:</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                        {new Date(scheduleData.settings.detail_surat_jalan.lastRun).toLocaleString('id-ID')}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50"
                    disabled={isSyncingDetailSj}
                    onClick={triggerDetailSjSync}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingDetailSj ? 'animate-spin' : ''}`} />
                    {isSyncingDetailSj ? 'Syncing...' : `Run Scraper Detail SJ (${detailSjScrapeRange.toUpperCase()}) Sekarang`}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Bottom Save Action */}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-[11px] text-muted-foreground">
                Perubahan jadwal disimpan di <code className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded">scraper/schedule_settings.json</code>
              </span>
              <Button
                size="sm"
                className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() => saveScheduleMutation.mutate()}
                disabled={saveScheduleMutation.isPending}
              >
                <Save className="h-3.5 w-3.5" />
                {saveScheduleMutation.isPending ? 'Menyimpan...' : 'Simpan Jadwal All Scrapers'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
