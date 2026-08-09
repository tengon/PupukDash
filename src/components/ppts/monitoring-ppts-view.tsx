'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSpjbPpts, type SpjbPptsItem } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { motion } from 'framer-motion'
import { Search, Store, FileText, CheckCircle2, RefreshCw, BarChart3, TrendingUp, Layers } from 'lucide-react'

function parseTonVal(val: any): number {
  if (!val) return 0
  const str = String(val).trim()
  if (str.includes(',') && str.includes('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0
  }
  return parseFloat(str) || 0
}

function SpjbCard({ item }: { item: SpjbPptsItem }) {
  const status = item.status || item.detail?.header?.status || 'Active'

  let statusBadgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200'
  let borderTopClass = 'border-t-2 border-t-emerald-500'
  if (status.toLowerCase() === 'rejected' || status.toLowerCase() === 'ditolak') {
    statusBadgeClass = 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200'
    borderTopClass = 'border-t-2 border-t-red-500'
  } else if (status.toLowerCase() === 'draft') {
    statusBadgeClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200'
    borderTopClass = 'border-t-2 border-t-gray-400'
  }

  const alokasiRows = item.detail?.alokasiTable?.rows || []

  return (
    <Card className={`card-highlight ${borderTopClass} border-l-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out`} style={{ boxShadow: 'var(--shadow-sm)' }}>
      <CardContent className="p-4 space-y-3">
        {/* Header Kios & Status */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Store className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 bg-background/80 shrink-0 font-semibold">
                {item.kodePpts}
              </Badge>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${statusBadgeClass}`}>
                {status}
              </Badge>
            </div>
            <h4 className="text-base font-bold truncate leading-snug" title={item.namaPpts}>
              {item.namaPpts}
            </h4>
          </div>
        </div>

        {/* Tabel Alokasi & Realisasi Pupuk */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1">
            <span>Produk / Alokasi</span>
            <span>Realisasi / Sisa (Ton)</span>
          </div>

          {alokasiRows.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-2">Data alokasi belum tersedia</p>
          ) : (
            alokasiRows.map((row, idx) => {
              const produk = row[1] || row[0] || 'Produk'
              const alokasiVal = parseTonVal(row[2])
              const realisasiVal = parseTonVal(row[3])
              const sisaVal = Math.max(0, alokasiVal - realisasiVal)
              const progressPct = alokasiVal > 0 ? Math.round((realisasiVal / alokasiVal) * 100) : 0
              const progressStr = `${progressPct}%`

              let prodBadgeBg = 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
              if (produk.toLowerCase().includes('urea')) {
                prodBadgeBg = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }

              return (
                <div key={idx} className="p-2.5 rounded-lg bg-background/80 border border-border/50 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-bold ${prodBadgeBg}`}>
                        {produk}
                      </Badge>
                      <span className="font-semibold text-foreground">Alokasi: {formatNumber(alokasiVal)} Ton</span>
                    </div>
                    <span className="font-bold tabular-nums text-primary">{progressStr}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressPct >= 80 ? 'bg-green-500' : progressPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Realisasi: <strong className="text-foreground">{formatNumber(realisasiVal)} Ton</strong></span>
                    <span>Sisa: <strong className="text-foreground">{formatNumber(sisaVal)} Ton</strong></span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function MonitoringPptsView() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  const { data: spjbRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['spjbPpts', search, statusFilter],
    queryFn: () => fetchSpjbPpts({ search, status: statusFilter }),
  })

  const items = spjbRes?.data || []
  const totalSpjb = spjbRes?.total || 0
  const scrapedAt = spjbRes?.scraped_at ? new Date(spjbRes.scraped_at).toLocaleString('id-ID') : '-'

  // Recalculate Totals mathematically across all items
  let totalUreaAlok = 0
  let totalUreaReal = 0
  let totalNpkAlok = 0
  let totalNpkReal = 0
  let totalOrganikAlok = 0
  let totalOrganikReal = 0

  items.forEach(item => {
    const rows = item.detail?.alokasiTable?.rows || []
    rows.forEach(r => {
      const prod = (r[1] || '').toLowerCase()
      const alok = parseTonVal(r[2])
      const real = parseTonVal(r[3])

      if (prod.includes('urea')) {
        totalUreaAlok += alok
        totalUreaReal += real
      } else if (prod.includes('npk')) {
        totalNpkAlok += alok
        totalNpkReal += real
      } else if (prod.includes('organik')) {
        totalOrganikAlok += alok
        totalOrganikReal += real
      }
    })
  })

  const grandAlok = totalUreaAlok + totalNpkAlok + totalOrganikAlok
  const grandReal = totalUreaReal + totalNpkReal + totalOrganikReal
  const grandPct = grandAlok > 0 ? ((grandReal / grandAlok) * 100).toFixed(1) : '0'

  const ureaPct = totalUreaAlok > 0 ? ((totalUreaReal / totalUreaAlok) * 100).toFixed(1) : '0'
  const npkPct = totalNpkAlok > 0 ? ((totalNpkReal / totalNpkAlok) * 100).toFixed(1) : '0'

  const ITEMS_PER_PAGE = 9
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pagedItems = items.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  const statusOptions = ['ALL', 'Active', 'Draft', 'Rejected']

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Card className="border-l-2 border-l-purple-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Monitoring SPJB PPTS (Kontrak Kios GOW CM)
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                GOW CM Alokasi
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kios / Kode PPTS / Kabupaten..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 h-9 w-full sm:w-64"
                />
              </div>
              <Button onClick={() => refetch()} size="sm" variant="outline" className="h-9 gap-1 shrink-0">
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary KPI Cards with Recalculated Values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Kontrak SPJB PPTS</p>
              <p className="text-lg font-bold tabular-nums">{totalSpjb} <span className="text-xs font-normal text-muted-foreground">kios</span></p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Alokasi & Realisasi Urea</p>
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 font-bold">{ureaPct}%</Badge>
              </div>
              <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatNumber(totalUreaReal)} <span className="text-xs font-normal text-muted-foreground">/ {formatNumber(totalUreaAlok)} Ton</span>
              </p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Alokasi & Realisasi NPK</p>
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 font-bold">{npkPct}%</Badge>
              </div>
              <p className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
                {formatNumber(totalNpkReal)} <span className="text-xs font-normal text-muted-foreground">/ {formatNumber(totalNpkAlok)} Ton</span>
              </p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Akumulasi Realisasi</p>
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-50 text-purple-700 font-bold">{grandPct}%</Badge>
              </div>
              <p className="text-sm font-bold tabular-nums text-primary mt-0.5">
                {formatNumber(grandReal)} <span className="text-xs font-normal text-muted-foreground">/ {formatNumber(grandAlok)} Ton</span>
              </p>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            {statusOptions.map((st) => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setPage(1) }}
                className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-30 mb-3" />
              <p className="text-sm font-medium">Belum ada data SPJB PPTS yang sesuai</p>
              <p className="text-xs opacity-70 mt-1">Pastikan scraper spjb_ppts.js sudah pernah dijalankan</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedItems.map((item, idx) => (
                  <SpjbCard key={`${item.kodePpts}_${item.nomorSpjb}_${idx}`} item={item} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Menampilkan {(safePage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(safePage * ITEMS_PER_PAGE, items.length)} dari {items.length} kontrak
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={safePage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="text-xs px-2 font-medium">Hal {safePage} dari {totalPages}</span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={safePage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
