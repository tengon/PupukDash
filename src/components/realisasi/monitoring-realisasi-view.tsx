'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchRealisasiStokKios, type RealisasiStokKiosItem } from '@/lib/api'
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
import { Search, Store, FileText, CheckCircle2, RefreshCw, Boxes, ArrowUpDown, ArrowUp, ArrowDown, Filter, PackageCheck, Layers } from 'lucide-react'

export function MonitoringRealisasiView() {
  const [search, setSearch] = useState('')
  const [produkFilter, setProdukFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [isSyncing, setIsSyncing] = useState(false)

  const [sortField, setSortField] = useState<'kios' | 'produk' | 'stok' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: realisasiRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['realisasiStokKios', search, produkFilter],
    queryFn: () => fetchRealisasiStokKios({ search, produk: produkFilter }),
  })

  const rawItems = realisasiRes?.data || []
  const scrapedAt = realisasiRes?.scraped_at ? new Date(realisasiRes.scraped_at).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : 'Belum Ada Data'

  // Summary KPIs
  const summary = useMemo(() => {
    let totalUreaKg = 0
    let totalNpkKg = 0
    let totalOthersKg = 0

    rawItems.forEach(item => {
      const pName = (item.namaProduk || '').toLowerCase()
      const pCode = (item.kodeProduk || '').toLowerCase()
      if (pName.includes('urea') || pCode.includes('un46')) {
        totalUreaKg += item.stokKg
      } else if (pName.includes('npk') || pCode.includes('npk')) {
        totalNpkKg += item.stokKg
      } else {
        totalOthersKg += item.stokKg
      }
    })

    return {
      totalRecords: rawItems.length,
      totalUreaKg,
      totalUreaTon: totalUreaKg / 1000,
      totalNpkKg,
      totalNpkTon: totalNpkKg / 1000,
      totalOthersKg,
    }
  }, [rawItems])

  // Sorting
  const sortedItems = useMemo(() => {
    return [...rawItems].sort((a, b) => {
      if (!sortField) return 0
      let valA: any = 0
      let valB: any = 0

      if (sortField === 'kios') {
        valA = a.namaKios || a.kodeKios
        valB = b.namaKios || b.kodeKios
      } else if (sortField === 'produk') {
        valA = a.namaProduk || a.kodeProduk
        valB = b.namaProduk || b.kodeProduk
      } else if (sortField === 'stok') {
        valA = a.stokKg
        valB = b.stokKg
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [rawItems, sortField, sortOrder])

  // Pagination
  const effectivePageSize = pageSize === -1 ? Math.max(1, sortedItems.length) : pageSize
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / effectivePageSize))
  const safePage = Math.min(page, totalPages)
  const pagedItems = pageSize === -1 ? sortedItems : sortedItems.slice((safePage - 1) * effectivePageSize, safePage * effectivePageSize)

  const toggleSort = (field: 'kios' | 'produk' | 'stok') => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else setSortField(null)
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const renderSortIcon = (field: 'kios' | 'produk' | 'stok') => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400 ml-1 inline" />
    )
  }

  const handleManualRefresh = async () => {
    try {
      setIsSyncing(true)
      await fetch('/api/gowcm/sync-realisasi-stok-kios', { method: 'POST' })
      await refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Card className="border-l-2 border-l-emerald-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Boxes className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Realisasi &gt;&gt; Stok Kios IPubers (GOW CM)
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  GOW CM Realisasi
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                <span>🕒 Terakhir Update Scraper:</span>
                <strong className="font-semibold text-foreground">{scrapedAt} WIB</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari Kode Kios / Nama Kios / Produk..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 h-9 w-full sm:w-64"
                />
              </div>

              {/* Show / Rows Filter */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                <span className="px-1.5 text-[11px] font-semibold text-muted-foreground">Show:</span>
                {[20, 50, 100, -1].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => { setPageSize(sz); setPage(1) }}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all ${
                      pageSize === sz
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sz === -1 ? 'Lihat Semua' : `${sz} baris`}
                  </button>
                ))}
              </div>

              <Button onClick={handleManualRefresh} disabled={isFetching || isSyncing} size="sm" variant="outline" className="h-9 gap-1.5 shrink-0 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isFetching || isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Memutakhirkan...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Item Stok Kios</p>
              <p className="text-lg font-bold tabular-nums">{summary.totalRecords} <span className="text-xs font-normal text-muted-foreground">record</span></p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Stok Urea IPubers</p>
              <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                {formatNumber(summary.totalUreaKg)} <span className="text-xs font-normal text-muted-foreground">Kg ({formatNumber(summary.totalUreaTon)} Ton)</span>
              </p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Stok NPK IPubers</p>
              <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatNumber(summary.totalNpkKg)} <span className="text-xs font-normal text-muted-foreground">Kg ({formatNumber(summary.totalNpkTon)} Ton)</span>
              </p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Status Koneksi iPubers</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-4 w-4" /> Sync Ready
              </p>
            </div>
          </div>

          {/* Product Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            {[
              { id: 'ALL', label: 'Semua Produk' },
              { id: 'UREA', label: '🌾 Urea (UN46)' },
              { id: 'NPK', label: '🌱 NPK Phonska' },
              { id: 'ORGANIK', label: '🍃 Organik' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => { setProdukFilter(st.id); setPage(1) }}
                className={`filter-pill ${produkFilter === st.id ? 'active' : ''}`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Boxes className="h-12 w-12 opacity-30 mb-3" />
              <p className="text-sm font-medium">Belum ada data Realisasi Stok Kios IPubers</p>
              <p className="text-xs opacity-70 mt-1">Pastikan scraper realisasi_stok_kios.js sudah pernah dijalankan</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-border/60 shadow-sm bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/70 text-muted-foreground font-semibold">
                      <th className="py-3 px-3 text-center w-10">#</th>
                      <th className="py-3 px-3">Kode Kios</th>
                      <th
                        onClick={() => toggleSort('kios')}
                        className="py-3 px-3 cursor-pointer hover:bg-muted/80 transition-colors select-none"
                      >
                        Nama Kios {renderSortIcon('kios')}
                      </th>
                      <th className="py-3 px-3">Kode Product</th>
                      <th
                        onClick={() => toggleSort('produk')}
                        className="py-3 px-3 cursor-pointer hover:bg-muted/80 transition-colors select-none"
                      >
                        Nama Product {renderSortIcon('produk')}
                      </th>
                      <th
                        onClick={() => toggleSort('stok')}
                        className="py-3 px-3 text-right cursor-pointer hover:bg-muted/80 transition-colors select-none"
                      >
                        Stok (Kg) {renderSortIcon('stok')}
                      </th>
                      <th className="py-3 px-3 text-center">Syncn At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {pagedItems.map((item, idx) => {
                      const absoluteIndex = pageSize === -1 ? idx + 1 : (safePage - 1) * pageSize + idx + 1
                      const isUrea = (item.namaProduk || '').toLowerCase().includes('urea')
                      const isNpk = (item.namaProduk || '').toLowerCase().includes('npk')

                      return (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-muted-foreground text-[11px]">
                            {absoluteIndex}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                            {item.kodeKios}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            {item.namaKios}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              {item.kodeProduk}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            <span className="flex items-center gap-1.5">
                              {isUrea ? '🌾' : isNpk ? '🌱' : '🍃'}
                              <span>{item.namaProduk}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatNumber(item.stokKg)} <span className="text-[10px] font-normal text-muted-foreground">kg</span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-muted-foreground text-[11px] font-mono whitespace-nowrap">
                            {item.syncAt || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Menampilkan {pagedItems.length} dari {sortedItems.length} record
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
