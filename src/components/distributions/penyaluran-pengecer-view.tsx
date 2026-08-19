'use client'

import { useState } from 'react'
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
} from 'lucide-react'

interface SuratJalanItem {
  noSuratJalan: string
  kodeProdusen: string
  tglSuratJalan: string
  tglDibuat: string
  tglDiubah: string
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

async function fetchPenyaluranPengecer(search?: string): Promise<PenyaluranResponse> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`/api/gowcm/penyaluran-pengecer${qs}`)
  if (!res.ok) throw new Error('Gagal memuat data')
  return res.json()
}

function SuratJalanRow({ item }: { item: SuratJalanItem }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail = item.detail && (
    (item.detail.tables && item.detail.tables.some(t => t.rows.length > 0)) ||
    (item.detail.labelValues && Object.keys(item.detail.labelValues).length > 0)
  )

  return (
    <>
      <TableRow
        className="hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => hasDetail && setExpanded(!expanded)}
      >
        <TableCell className="font-mono text-xs font-semibold text-primary">
          {item.noSuratJalan || '-'}
        </TableCell>
        <TableCell className="text-xs">{item.kodeProdusen || '-'}</TableCell>
        <TableCell className="text-xs tabular-nums">{item.tglSuratJalan || '-'}</TableCell>
        <TableCell className="text-xs tabular-nums">{item.tglDibuat || '-'}</TableCell>
        <TableCell className="text-xs tabular-nums">{item.tglDiubah || '-'}</TableCell>
        <TableCell className="text-center">
          {hasDetail ? (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              {expanded
                ? <ChevronUp className="h-4 w-4 text-primary" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </Button>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>

      {/* Detail expanded row */}
      <AnimatePresence>
        {expanded && hasDetail && (
          <TableRow>
            <TableCell colSpan={6} className="p-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-muted/30 border-t border-border/40 px-4 py-3"
              >
                {/* Label-Value pairs */}
                {item.detail?.labelValues && Object.keys(item.detail.labelValues).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                    {Object.entries(item.detail.labelValues).slice(0, 12).map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <span className="text-muted-foreground">{k}: </span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detail tables */}
                {item.detail?.tables?.map((tbl, tblIdx) =>
                  tbl.rows.length > 0 ? (
                    <div key={tblIdx} className="mb-3">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">
                        Tabel Detail {tblIdx + 1}
                      </p>
                      <div className="overflow-x-auto rounded border border-border/40">
                        <table className="text-xs w-full">
                          <thead className="bg-muted/60">
                            <tr>
                              {tbl.headers.map((h, i) => (
                                <th key={i} className="px-2 py-1 text-left font-semibold text-muted-foreground whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tbl.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-t border-border/20 hover:bg-muted/30">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="px-2 py-1 whitespace-nowrap">
                                    {cell || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null
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
  const [isSyncing, setIsSyncing] = useState(false)

  const { data: res, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['penyaluranPengecer', search],
    queryFn: () => fetchPenyaluranPengecer(search),
  })

  const handleSearch = () => setSearch(searchInput)

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

  const items = res?.data || []
  const scrapedAt = res?.scraped_at
    ? new Date(res.scraped_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <Card className="border-l-2 border-l-blue-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Distribusi — Penyaluran ke Pengecer
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                  Surat Jalan
                </Badge>
              </CardTitle>
              {scrapedAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <span>🕒 Terakhir Update Scraper:</span>
                  <strong className="font-semibold text-foreground">{scrapedAt}</strong>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No. Surat Jalan / Produsen..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="pl-9 h-9 w-full sm:w-64"
                />
              </div>
              <Button onClick={handleSearch} size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                Cari
              </Button>
              <Button
                onClick={handleManualRefresh}
                disabled={isFetching || isSyncing}
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 shrink-0 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isFetching || isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Memperbarui...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Surat Jalan</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{res?.total || 0}</p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Distributor</p>
              <p className="text-sm font-bold truncate">CV. ANUGERAH MAKMUR</p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Sumber Data</p>
              <p className="text-xs font-semibold text-muted-foreground">GOW CM Pupuk Indonesia</p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Ditampilkan</p>
              <p className="text-lg font-bold">{items.length}</p>
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
            /* Belum ada data / scraper belum jalan */
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-12 w-12 opacity-30 mb-3 text-amber-500" />
              <p className="text-sm font-medium">Scraper Belum Dijalankan</p>
              <p className="text-xs opacity-70 mt-1 text-center max-w-sm">{res.message}</p>
              <Button
                onClick={handleManualRefresh}
                size="sm"
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSyncing}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Jalankan Scraper Sekarang
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Truck className="h-12 w-12 opacity-30 mb-3" />
              <p className="text-sm font-medium">Tidak ada data Surat Jalan</p>
              <p className="text-xs opacity-70 mt-1">
                {search ? 'Coba ubah kata pencarian' : 'Jalankan scraper penyaluran_pengecer.js'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" /> No. Surat Jalan
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> Kode Produsen
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Tgl Surat Jalan
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Tgl Dibuat
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Tgl Diubah
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-3 w-3" /> Detail
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <SuratJalanRow key={`${item.noSuratJalan}_${idx}`} item={item} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
