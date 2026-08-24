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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Eye,
  Store,
  Sparkles,
} from 'lucide-react'

interface SuratJalanDetailItem {
  id?: string
  noSuratJalan: string
  nomorPkp?: string
  nomorOrder?: string
  kodeSo?: string
  provinsi?: string
  kabupaten?: string
  kecamatan?: string
  desa?: string
  kodeKios?: string
  namaKios?: string
  namaProduk?: string
  jumlah?: number
  satuan?: string
  urea?: number
  npk?: number
  organik?: number
  npkKakao?: number
  za?: number
  sp36?: number
  tglSuratJalan?: string
  tglSyncIpubers?: string
  tglTerimaKios?: string
  asalPengambilan?: string
  namaProdusen?: string
  kodeDistributor?: string
  namaDistributor?: string
  keterangan?: string
}

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
  details?: SuratJalanDetailItem[]
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
      month,
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

async function fetchPenyaluranPengecer(search: string): Promise<PenyaluranResponse> {
  const res = await fetch(`/api/gowcm/penyaluran-pengecer?search=${encodeURIComponent(search)}`)
  if (!res.ok) throw new Error('Gagal mengambil data Penyaluran Pengecer')
  return res.json()
}

/** Component Modal Detail Surat Jalan */
function DetailSuratJalanModal({
  item,
  open,
  onOpenChange,
}: {
  item: SuratJalanItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: detailRes, isLoading } = useQuery({
    queryKey: ['detailSuratJalan', item?.noSuratJalan],
    queryFn: async () => {
      if (!item?.noSuratJalan) return null
      const res = await fetch(`/api/gowcm/detail-surat-jalan?noSuratJalan=${encodeURIComponent(item.noSuratJalan)}`)
      if (!res.ok) throw new Error('Gagal mengambil detail Surat Jalan')
      return res.json()
    },
    enabled: open && !!item?.noSuratJalan,
  })

  if (!item) return null

  const detailItems: SuratJalanDetailItem[] = detailRes?.data || item.details || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-600 dark:text-emerald-400">
            <FileText className="h-5 w-5 text-emerald-600" />
            Rincian Detail Surat Jalan — {item.noSuratJalan}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Informasi lengkap dokumen Penyaluran ke Pengecer dan Rincian Item (Detail SJ-PKP-Order)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs pt-2">
          {/* Header Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">No. Surat Jalan</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs">{item.noSuratJalan}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Nomor PKP</span>
              <span className="font-mono font-semibold text-foreground">{item.nomorPkp || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Nomor Order / Kode SO</span>
              <span className="font-mono font-semibold text-foreground">{item.nomorOrder || item.kodeSo || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tgl Surat Jalan</span>
              <span className="font-medium text-foreground">{item.tglSuratJalan || item.tglDibuat || '-'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Kecamatan & Kab</span>
              <span className="font-semibold text-foreground">{[item.kecamatan, item.kabupaten, item.provinsi].filter(Boolean).join(', ') || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tgl Sync IPubers</span>
              <span className="font-medium text-foreground">{item.tglSyncIpubers || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tgl Terima Kios</span>
              <span className="font-medium text-foreground">{item.tglTerimaKios || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Asal Pengambilan</span>
              <span className="font-medium text-foreground">{item.asalPengambilan || '-'}</span>
            </div>
          </div>

          {/* Produsen & Distributor Card */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Produsen</span>
              <span className="font-semibold text-foreground">{item.namaProdusen || item.kodeProdusen || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Distributor</span>
              <span className="font-semibold text-foreground">{item.namaDistributor || item.kodeDistributor || '-'}</span>
            </div>
          </div>

          {/* Pupuk Breakdown Badge Grid */}
          <div className="p-3.5 rounded-xl border bg-card space-y-2">
            <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-emerald-600" />
              Alokasi Kuantitas Pupuk Bersubsidi (detail-sj-pkp-order)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs text-center font-mono">
              <div className="p-2 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">Urea</span>
                <strong className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{item.urea || '0'}</strong>
              </div>
              <div className="p-2 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 block">NPK</span>
                <strong className="text-sm font-bold text-blue-800 dark:text-blue-200">{item.npk || '0'}</strong>
              </div>
              <div className="p-2 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">ZA</span>
                <strong className="text-sm font-bold text-amber-800 dark:text-amber-200">{item.za || '0'}</strong>
              </div>
              <div className="p-2 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">SP-36</span>
                <strong className="text-sm font-bold text-purple-800 dark:text-purple-200">{item.sp36 || '0'}</strong>
              </div>
              <div className="p-2 rounded-lg border bg-amber-950/10 dark:bg-amber-900/20">
                <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 block">Organik</span>
                <strong className="text-sm font-bold text-amber-950 dark:text-amber-100">{item.organik || '0'}</strong>
              </div>
              <div className="p-2 rounded-lg border bg-amber-700/10 dark:bg-amber-800/20">
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 block">NPK Kakao</span>
                <strong className="text-sm font-bold text-amber-900 dark:text-amber-100">{item.npkKakao || '0'}</strong>
              </div>
            </div>
          </div>

          {/* Rincian Item Detail Table (SuratJalanDetail) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Store className="h-4 w-4 text-emerald-600" />
                Tabel Rincian Item Detail (Database SuratJalanDetail)
              </p>
              <Badge variant="outline" className="font-mono text-[10px]">
                {detailItems.length} Rincian Item
              </Badge>
            </div>

            {isLoading ? (
              <div className="space-y-1.5 py-2">
                <Skeleton className="h-10 w-full rounded" />
                <Skeleton className="h-10 w-full rounded" />
              </div>
            ) : detailItems.length === 0 ? (
              <div className="p-4 text-center border rounded-lg bg-muted/20 text-muted-foreground">
                <p className="text-xs font-medium">Belum ada rincian item detail tersimpan untuk Surat Jalan ini.</p>
                <p className="text-[11px] opacity-75 mt-0.5">Jalankan scraper `node detail_surat_jalan.js` dan import ke database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 text-[11px]">
                      <TableHead className="w-10">No</TableHead>
                      <TableHead>Nama Kios / PKP</TableHead>
                      <TableHead>Kecamatan & Desa</TableHead>
                      <TableHead>Jenis Produk</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Satuan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailItems.map((d, idx) => (
                      <TableRow key={d.id || idx} className="text-xs hover:bg-muted/40">
                        <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-foreground">{d.namaKios || (d.nomorPkp ? `Kios PKP (${d.nomorPkp})` : 'Kios Pengecer')}</TableCell>
                        <TableCell className="text-muted-foreground">{[d.kecamatan, d.desa].filter(Boolean).join(', ') || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40">
                            {d.namaProduk || 'Pupuk Bersubsidi'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {d.jumlah ?? 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{d.satuan || 'Ton'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SuratJalanRow({
  item,
  onOpenDetail,
}: {
  item: SuratJalanItem
  onOpenDetail: (item: SuratJalanItem) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasPupukAlloc = !!(item.urea || item.npk || item.za || item.sp36 || item.organik || item.npkKakao)

  return (
    <>
      <TableRow
        className="hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* No. Surat Jalan (Clickable Button) */}
        <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
          <Button
            variant="link"
            className="font-mono text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 p-0 h-auto gap-1"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetail(item)
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{item.noSuratJalan || '-'}</span>
          </Button>
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

        {/* Action Button & Toggle */}
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDetail(item)
              }}
            >
              <FileText className="h-3 w-3" />
              <span>Detail</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              {expanded
                ? <ChevronUp className="h-4 w-4 text-primary" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </Button>
          </div>
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

                {/* Sub-table for details array if attached */}
                {item.details && item.details.length > 0 && (
                  <div className="p-3 rounded-lg bg-background/80 border border-border/50 space-y-2">
                    <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-emerald-600" />
                      Rincian Kios / Pengecer (SuratJalanDetail)
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 text-[10px]">
                          <TableHead>Nama Kios</TableHead>
                          <TableHead>Kecamatan & Desa</TableHead>
                          <TableHead>Produk</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.details.map((d, i) => (
                          <TableRow key={d.id || i} className="text-xs">
                            <TableCell className="font-semibold">{d.namaKios || (d.nomorPkp ? `Kios PKP (${d.nomorPkp})` : 'Kios Pengecer')}</TableCell>
                            <TableCell>{[d.kecamatan, d.desa].filter(Boolean).join(', ') || '-'}</TableCell>
                            <TableCell>{d.namaProduk || '-'}</TableCell>
                            <TableCell className="text-right font-mono font-bold">{d.jumlah} {d.satuan || 'Ton'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

  // Selected item for Detail Modal
  const [selectedDetailItem, setSelectedDetailItem] = useState<SuratJalanItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Date Range Filters: 'all' | 'today' | '7days' | '1month' | 'custom_month'
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>('all')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(2026)

  const { data: res, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['penyaluranPengecer', search],
    queryFn: () => fetchPenyaluranPengecer(search),
  })

  const handleOpenDetailModal = (item: SuratJalanItem) => {
    setSelectedDetailItem(item)
    setIsDetailModalOpen(true)
  }

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
      if (!dateInfo) return true

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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-emerald-600 font-bold" />
      : <ArrowDown className="h-3.5 w-3.5 text-emerald-600 font-bold" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Modal Detail Surat Jalan */}
      <DetailSuratJalanModal
        item={selectedDetailItem}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />

      <Card className="border-border/60 shadow-xs">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Leaf className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Monitoring Penyaluran ke Pengecer (Surat Jalan)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monitoring penyaluran pupuk bersubsidi dari Distributor (PUD) ke Kios Pengecer berbasis No. Surat Jalan GOW CM
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={handleManualRefresh}
                disabled={isSyncing || isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing || isFetching ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Search bar & Range Filter Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari No. Surat Jalan, PKP, Order, Kios..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Button size="sm" onClick={handleSearch} className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                Cari
              </Button>
              {search && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
                  className="h-8 text-xs"
                >
                  Reset
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {res?.scraped_at && (
                <Badge variant="outline" className="text-[10px] font-mono gap-1 py-0.5">
                  <Clock className="h-2.5 w-2.5 text-emerald-600" />
                  Sync: {new Date(res.scraped_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                DataTables Sorting: DESC
              </Badge>
            </div>
          </div>

          {/* Date Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3 text-emerald-600" /> Filter Tanggal:
            </span>

            <Button
              size="sm"
              variant={timeRangeFilter === 'all' ? 'default' : 'outline'}
              className={`h-7 text-xs px-2.5 ${timeRangeFilter === 'all' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}`}
              onClick={() => { setTimeRangeFilter('all'); setPage(1) }}
            >
              Lihat Semua
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
                      <SuratJalanRow
                        key={`${item.noSuratJalan}_${idx}`}
                        item={item}
                        onOpenDetail={handleOpenDetailModal}
                      />
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
