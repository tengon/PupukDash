'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Truck,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  Package,
  Hash,
  AlertCircle,
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Filter,
  Leaf,
  Layers,
  CheckCircle2,
} from 'lucide-react'

interface SuratJalanItem {
  noSuratJalan: string
  uuid?: string
  nomorPkp?: string
  nomorOrder?: string
  kodeSo?: string
  kodeDistributor?: string
  namaDistributor?: string
  provinsi?: string
  kabupaten?: string
  kecamatan?: string
  kodeProdusen?: string
  namaProdusen?: string
  urea?: string
  npk?: string
  organik?: string
  npkKakao?: string
  za?: string
  sp36?: string
  status?: string
  tglSuratJalan?: string
  tglDibuat?: string
  tglDiubah?: string
  tglSyncIpubers?: string
  tglTerimaKios?: string
  asalPengambilan?: string
  href?: string
  detail?: {
    tables?: Array<{ headers: string[]; rows: string[][] }>
    labelValues?: Record<string, string>
  } | null
}

interface PenyaluranResponse {
  success: boolean
  scraped_at: string | null
  total: number
  data: SuratJalanItem[]
  message?: string
}

type SortField = 'noSuratJalan' | 'tglSuratJalan' | 'tglDibuat' | 'tglDiubah' | 'namaProdusen'
type SortOrder = 'asc' | 'desc'
type TimeRangeFilter = 'all' | 'today' | '7days' | '1month' | 'custom_month'

const ITEMS_PER_PAGE = 15

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
  jul: 6, ags: 7, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
}

function parseSuratJalanDate(str?: string): number {
  if (!str) return 0
  const parts = str.toLowerCase().split('-')
  if (parts.length >= 3) {
    const year = parseInt(parts[0]) || 2026
    const month = MONTH_MAP[parts[1]] !== undefined ? MONTH_MAP[parts[1]] : 0
    const dayRest = parts[2].replace(',', '').trim()
    const day = parseInt(dayRest) || 1
    const isoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const timestamp = Date.parse(isoStr)
    if (!isNaN(timestamp)) return timestamp
  }
  return Date.parse(str) || 0
}

function getItemDateInfo(item: SuratJalanItem) {
  const dateStr = item.tglSuratJalan || item.tglDibuat || item.tglDiubah || ''
  if (!dateStr) return null

  const parts = dateStr.toLowerCase().split('-')
  if (parts.length >= 3) {
    const year = parseInt(parts[0]) || 2026
    const month = MONTH_MAP[parts[1]] !== undefined ? MONTH_MAP[parts[1]] : 0
    const dayRest = parts[2].replace(',', '').trim()
    const day = parseInt(dayRest) || 1

    const dateObj = new Date(year, month, day)
    return {
      year,
      month, // 0-11
      day,
      timestamp: dateObj.getTime(),
    }
  }
  const timestamp = Date.parse(dateStr)
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp)
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      timestamp,
    }
  }
  return null
}

async function fetchPenyaluranPengecer(search?: string): Promise<PenyaluranResponse> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`/api/gowcm/penyaluran-pengecer${qs}`)
  if (!res.ok) throw new Error('Gagal memuat data')
  return res.json()
}

function SuratJalanRow({ item }: { item: SuratJalanItem }) {
  const [expanded, setExpanded] = useState(false)
  const hasPupukAlloc = !!(item.urea || item.npk || item.za || item.sp36 || item.organik || item.npkKakao)

  return (
    <>
      <TableRow
        className="hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* No. Surat Jalan */}
        <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
          {item.noSuratJalan || '-'}
        </TableCell>

        {/* Nomor PKP */}
        <TableCell className="text-xs font-mono whitespace-nowrap">
          {item.nomorPkp || '-'}
        </TableCell>

        {/* Nomor Order / Kode SO */}
        <TableCell className="text-xs font-mono whitespace-nowrap">
          {item.nomorOrder || item.kodeSo || '-'}
        </TableCell>

        {/* Lokasi (Kecamatan & Kab) */}
        <TableCell className="text-xs">
          <div className="font-semibold text-foreground">{item.kecamatan || '-'}</div>
          <div className="text-[10px] text-muted-foreground">{item.kabupaten || '-'}</div>
        </TableCell>

        {/* Produsen & Distributor */}
        <TableCell className="text-xs">
          <div className="font-semibold text-foreground">{item.namaProdusen || item.kodeProdusen || '-'}</div>
          {item.namaDistributor && (
            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={item.namaDistributor}>
              {item.namaDistributor}
            </div>
          )}
        </TableCell>

        {/* Alokasi Pupuk */}
        <TableCell className="text-xs">
          <div className="flex flex-wrap items-center gap-1">
            {item.urea && parseFloat(item.urea) > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                Urea: {item.urea}
              </Badge>
            )}
            {item.npk && parseFloat(item.npk) > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                NPK: {item.npk}
              </Badge>
            )}
            {item.za && parseFloat(item.za) > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                ZA: {item.za}
              </Badge>
            )}
            {item.sp36 && parseFloat(item.sp36) > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                SP-36: {item.sp36}
              </Badge>
            )}
            {item.organik && parseFloat(item.organik) > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-950/10 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200">
                Org: {item.organik}
              </Badge>
            )}
            {!hasPupukAlloc && (
              <span className="text-[11px] text-muted-foreground">-</span>
            )}
          </div>
        </TableCell>

        {/* Tgl Surat Jalan */}
        <TableCell className="text-xs tabular-nums whitespace-nowrap">
          {item.tglSuratJalan || item.tglDibuat || '-'}
        </TableCell>

        {/* Tgl Sync IPubers */}
        <TableCell className="text-xs tabular-nums whitespace-nowrap">
          {item.tglSyncIpubers || '-'}
        </TableCell>

        {/* Tgl Terima Kios */}
        <TableCell className="text-xs tabular-nums whitespace-nowrap">
          {item.tglTerimaKios || '-'}
        </TableCell>

        {/* Asal Pengambilan */}
        <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
          {item.asalPengambilan || '-'}
        </TableCell>

        {/* Action Toggle */}
        <TableCell className="text-center">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            {expanded
              ? <ChevronUp className="h-4 w-4 text-primary" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded row with full PKP Order detail info */}
      <AnimatePresence>
        {expanded && (
          <TableRow>
            <TableCell colSpan={11} className="p-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-muted/30 border-t border-border/40 px-4 py-3 space-y-3"
              >
                {/* Header Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-background/80 border border-border/50 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Nomor PKP</span>
                    <span className="font-mono font-bold text-foreground">{item.nomorPkp || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Nomor Order / Kode SO</span>
                    <span className="font-mono font-bold text-foreground">{item.nomorOrder || item.kodeSo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Lokasi (Kec. / Kab. / Prov.)</span>
                    <span className="font-semibold text-foreground">{[item.kecamatan, item.kabupaten, item.provinsi].filter(Boolean).join(', ') || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Asal Pengambilan</span>
                    <span className="font-semibold text-foreground">{item.asalPengambilan || '-'}</span>
                  </div>
                </div>

                {/* Pupuk Breakdown Table */}
                <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                  <p className="text-[11px] font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-emerald-600" />
                    Rincian Kuantitas Pupuk Bersubsidi (detail-sj-pkp-order)
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs text-center font-mono">
                    <div className="p-2 rounded border bg-emerald-50/50 dark:bg-emerald-950/20">
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 block">Urea</span>
                      <strong className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{item.urea || '0'}</strong>
                    </div>
                    <div className="p-2 rounded border bg-blue-50/50 dark:bg-blue-950/20">
                      <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 block">NPK</span>
                      <strong className="text-sm font-bold text-blue-800 dark:text-blue-200">{item.npk || '0'}</strong>
                    </div>
                    <div className="p-2 rounded border bg-amber-50/50 dark:bg-amber-950/20">
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 block">ZA</span>
                      <strong className="text-sm font-bold text-amber-800 dark:text-amber-200">{item.za || '0'}</strong>
                    </div>
                    <div className="p-2 rounded border bg-purple-50/50 dark:bg-purple-950/20">
                      <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 block">SP-36</span>
                      <strong className="text-sm font-bold text-purple-800 dark:text-purple-200">{item.sp36 || '0'}</strong>
                    </div>
                    <div className="p-2 rounded border bg-amber-950/10 dark:bg-amber-900/20">
                      <span className="text-[10px] font-semibold text-amber-900 dark:text-amber-300 block">Organik</span>
                      <strong className="text-sm font-bold text-amber-950 dark:text-amber-100">{item.organik || '0'}</strong>
                    </div>
                    <div className="p-2 rounded border bg-amber-700/10 dark:bg-amber-800/20">
                      <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 block">NPK Kakao</span>
                      <strong className="text-sm font-bold text-amber-900 dark:text-amber-100">{item.npkKakao || '0'}</strong>
                    </div>
                  </div>
                </div>

                {/* Additional Detail Tables / LabelValues if present */}
                {item.detail?.labelValues && Object.keys(item.detail.labelValues).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 rounded bg-background/60 border border-border/30 text-xs">
                    {Object.entries(item.detail.labelValues).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-muted-foreground">{k}: </span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  )
}

export function PenyaluranPengecerView() {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [isSyncing, setIsSyncing] = useState(false)
  const [sortField, setSortField] = useState<SortField>('tglSuratJalan')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Date Range Filters: 'all' | 'today' | '7days' | '1month' | 'custom_month'
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>('all')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()) // 0 - 11
  const [selectedYear, setSelectedYear] = useState<number>(2026)

  const { data: res, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['penyaluranPengecer', search],
    queryFn: () => fetchPenyaluranPengecer(search),
  })

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleManualRefresh = async () => {
    setIsSyncing(true)
    try {
      await fetch('/api/gowcm/sync-penyaluran-pengecer', { method: 'POST' })
      await refetch()
    } catch {
      await refetch()
    } finally {
      setIsSyncing(false)
    }
  }

  const rawItems = res?.data || []

  // 1. Date Range Filtering
  const dateFilteredItems = useMemo(() => {
    if (timeRangeFilter === 'all') return rawItems

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000

    return rawItems.filter(item => {
      const dateInfo = getItemDateInfo(item)
      if (!dateInfo) return true // Tampilkan jika tanggal gagal di-parse

      if (timeRangeFilter === 'today') {
        return dateInfo.timestamp >= todayStart
      }
      if (timeRangeFilter === '7days') {
        return dateInfo.timestamp >= sevenDaysAgo
      }
      if (timeRangeFilter === '1month') {
        return dateInfo.timestamp >= thirtyDaysAgo
      }
      if (timeRangeFilter === 'custom_month') {
        return dateInfo.year === selectedYear && dateInfo.month === selectedMonth
      }
      return true
    })
  }, [rawItems, timeRangeFilter, selectedMonth, selectedYear])

  // 2. Sorting logic
  const sortedItems = useMemo(() => {
    if (!sortField) return dateFilteredItems
    return [...dateFilteredItems].sort((a, b) => {
      let comp = 0
      if (sortField === 'noSuratJalan') {
        comp = (a.noSuratJalan || '').localeCompare(b.noSuratJalan || '')
      } else if (sortField === 'tglSuratJalan') {
        comp = parseSuratJalanDate(a.tglSuratJalan) - parseSuratJalanDate(b.tglSuratJalan)
      } else if (sortField === 'tglDibuat') {
        comp = parseSuratJalanDate(a.tglDibuat) - parseSuratJalanDate(b.tglDibuat)
      } else if (sortField === 'tglDiubah') {
        comp = parseSuratJalanDate(a.tglDiubah) - parseSuratJalanDate(b.tglDiubah)
      } else if (sortField === 'namaProdusen') {
        comp = (a.namaProdusen || '').localeCompare(b.namaProdusen || '')
      }
      return sortOrder === 'asc' ? comp : -comp
    })
  }, [dateFilteredItems, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pagedItems = sortedItems.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  const scrapedAt = res?.scraped_at
    ? new Date(res.scraped_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : null

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0 font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0 font-bold" />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <Card className="border-l-2 border-l-emerald-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Leaf className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Monitoring Distribusi — Surat Jalan (detail-sj-pkp-order)
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  GOW CM Pupuk Indonesia
                </Badge>
              </CardTitle>
              {scrapedAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <span>🕒 Terakhir Update Scraper:</span>
                  <strong className="font-semibold text-foreground">{scrapedAt} WIB</strong>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No. Surat Jalan / PKP / SO / Kec..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="pl-9 h-9 w-full sm:w-64"
                />
              </div>
              <Button onClick={handleSearch} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-bold">
                Cari
              </Button>
              <Button
                onClick={handleManualRefresh}
                disabled={isFetching || isSyncing}
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 shrink-0 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isFetching || isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Memperbarui...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* Opsi Filter Tanggal / Waktu */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/40 mt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5 text-emerald-600" />
              <span>Filter Tanggal:</span>
            </div>

            <Button
              size="sm"
              variant={timeRangeFilter === 'all' ? 'default' : 'outline'}
              className={`h-7 text-xs px-2.5 ${timeRangeFilter === 'all' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}`}
              onClick={() => { setTimeRangeFilter('all'); setPage(1) }}
            >
              Semua
            </Button>

            <Button
              size="sm"
              variant={timeRangeFilter === 'today' ? 'default' : 'outline'}
              className={`h-7 text-xs px-2.5 ${timeRangeFilter === 'today' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}`}
              onClick={() => { setTimeRangeFilter('today'); setPage(1) }}
            >
              Hari Ini
            </Button>

            <Button
              size="sm"
              variant={timeRangeFilter === '7days' ? 'default' : 'outline'}
              className={`h-7 text-xs px-2.5 ${timeRangeFilter === '7days' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}`}
              onClick={() => { setTimeRangeFilter('7days'); setPage(1) }}
            >
              7 Hari Terakhir
            </Button>

            <Button
              size="sm"
              variant={timeRangeFilter === '1month' ? 'default' : 'outline'}
              className={`h-7 text-xs px-2.5 ${timeRangeFilter === '1month' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}`}
              onClick={() => { setTimeRangeFilter('1month'); setPage(1) }}
            >
              1 Bulan Terakhir
            </Button>

            <Button
              size="sm"
              variant={timeRangeFilter === 'custom_month' ? 'default' : 'outline'}
              className={`h-7 text-xs px-2.5 ${timeRangeFilter === 'custom_month' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}`}
              onClick={() => { setTimeRangeFilter('custom_month'); setPage(1) }}
            >
              Pilihan Bulan
            </Button>

            {/* Sub-controls untuk Pilihan Bulan */}
            {timeRangeFilter === 'custom_month' && (
              <div className="flex items-center gap-1.5 ml-1 animate-in fade-in slide-in-from-left-2 duration-200">
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(val) => { setSelectedMonth(parseInt(val)); setPage(1) }}
                >
                  <SelectTrigger className="h-7 text-xs w-32 border-emerald-300 dark:border-emerald-700">
                    <SelectValue placeholder="Pilih Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, idx) => (
                      <SelectItem key={idx} value={String(idx)} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(selectedYear)}
                  onValueChange={(val) => { setSelectedYear(parseInt(val)); setPage(1) }}
                >
                  <SelectTrigger className="h-7 text-xs w-24 border-emerald-300 dark:border-emerald-700">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026" className="text-xs">2026</SelectItem>
                    <SelectItem value="2025" className="text-xs">2025</SelectItem>
                    <SelectItem value="2024" className="text-xs">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Surat Jalan</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{rawItems.length}</p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Distributor PUD</p>
              <p className="text-sm font-bold truncate">CV. ANUGERAH MAKMUR</p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Filter Waktu</p>
              <p className="text-xs font-semibold text-foreground truncate">
                {timeRangeFilter === 'all' && 'Semua Tanggal'}
                {timeRangeFilter === 'today' && 'Hari Ini'}
                {timeRangeFilter === '7days' && '7 Hari Terakhir'}
                {timeRangeFilter === '1month' && '30 Hari Terakhir'}
                {timeRangeFilter === 'custom_month' && `${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
              </p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Tersaring</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{sortedItems.length} Dokumen</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : res?.message ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-12 w-12 opacity-30 mb-3 text-amber-500" />
              <p className="text-sm font-medium">Scraper Belum Dijalankan</p>
              <p className="text-xs opacity-70 mt-1 text-center max-w-sm">{res.message}</p>
              <Button
                onClick={handleManualRefresh}
                size="sm"
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={isSyncing}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Jalankan Scraper Sekarang
              </Button>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Truck className="h-12 w-12 opacity-30 mb-3" />
              <p className="text-sm font-medium">Tidak ada data Surat Jalan yang sesuai filter</p>
              <p className="text-xs opacity-70 mt-1">
                {search || timeRangeFilter !== 'all' ? 'Coba ubah opsi filter tanggal atau kata pencarian' : 'Jalankan scraper penyaluran_pengecer.js di VPS'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 select-none">
                      {/* Sortable: No. Surat Jalan */}
                      <TableHead
                        className="text-xs font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort('noSuratJalan')}
                      >
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>No. Surat Jalan</span>
                          {renderSortIcon('noSuratJalan')}
                        </div>
                      </TableHead>

                      <TableHead className="text-xs font-semibold">Nomor PKP</TableHead>
                      <TableHead className="text-xs font-semibold">Nomor Order / SO</TableHead>
                      <TableHead className="text-xs font-semibold">Kecamatan & Kab</TableHead>
                      <TableHead className="text-xs font-semibold">Produsen & Distributor</TableHead>
                      <TableHead className="text-xs font-semibold">Alokasi Pupuk</TableHead>

                      {/* Sortable: Tgl Surat Jalan */}
                      <TableHead
                        className="text-xs font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort('tglSuratJalan')}
                      >
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>Tgl Surat Jalan</span>
                          {renderSortIcon('tglSuratJalan')}
                        </div>
                      </TableHead>

                      <TableHead className="text-xs font-semibold">Tgl Sync IPubers</TableHead>
                      <TableHead className="text-xs font-semibold">Tgl Terima Kios</TableHead>
                      <TableHead className="text-xs font-semibold">Asal Pengambilan</TableHead>

                      <TableHead className="text-xs font-semibold text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="h-3 w-3 text-emerald-600 shrink-0" /> Detail
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedItems.map((item, idx) => (
                      <SuratJalanRow key={`${item.noSuratJalan}_${idx}`} item={item} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>
                    Menampilkan {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, sortedItems.length)} dari {sortedItems.length} Surat Jalan tersaring
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2 font-medium">
                      {safePage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
