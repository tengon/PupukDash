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
import { Search, Store, FileText, CheckCircle2, RefreshCw, BarChart3, TrendingUp, Layers, ArrowUpDown, ArrowUp, ArrowDown, PieChart } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function parseTonVal(val: any): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const str = String(val).trim()
  if (!str || str === '-') return 0

  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0
  }
  if (str.includes('.')) {
    const parts = str.split('.')
    if (parts.length === 2 && parts[1].length !== 3) {
      return parseFloat(str) || 0
    }
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

  // Normalisasi data alokasi produk (dukung alokasiDetail baru & legacy alokasiTable)
  const normalizedAllocations = item.alokasiDetail && item.alokasiDetail.length > 0
    ? item.alokasiDetail.map(d => ({
        produk: d.produk || 'Produk',
        alokasiVal: parseTonVal(d.alokasiSpjb),
        realisasiVal: parseTonVal(d.realisasi),
        sisaVal: parseTonVal(d.sisaAlokasi) || Math.max(0, parseTonVal(d.alokasiSpjb) - parseTonVal(d.realisasi)),
        progressPct: parseTonVal(d.alokasiSpjb) > 0 ? Math.round((parseTonVal(d.realisasi) / parseTonVal(d.alokasiSpjb)) * 100) : 0,
      }))
    : (item.detail?.alokasiTable?.rows || []).map(row => {
        const alok = parseTonVal(row[2])
        const real = parseTonVal(row[3])
        return {
          produk: row[1] || row[0] || 'Produk',
          alokasiVal: alok,
          realisasiVal: real,
          sisaVal: Math.max(0, alok - real),
          progressPct: alok > 0 ? Math.round((real / alok) * 100) : 0,
        }
      })

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

          {normalizedAllocations.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-2">Data alokasi belum tersedia</p>
          ) : (
            normalizedAllocations.map((alloc, idx) => {
              const produk = alloc.produk
              const alokasiVal = alloc.alokasiVal
              const realisasiVal = alloc.realisasiVal
              const sisaVal = alloc.sisaVal
              const progressPct = alloc.progressPct
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

function CustomPptsTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl p-3 shadow-lg text-xs space-y-2 max-w-xs min-w-[240px]">
      <div className="border-b border-border/60 pb-1.5 flex justify-between items-center">
        <div>
          <p className="font-bold text-sm text-foreground">{item.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono">Kode: {item.code} {item.district ? `• Kec. ${item.district}` : ''}</p>
        </div>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 flex justify-between items-center">
        <span className="font-semibold text-purple-700 dark:text-purple-300">Total Alokasi (SPJB)</span>
        <span className="font-mono font-extrabold text-purple-700 dark:text-purple-300">
          {formatNumber(item.totalAlok)} Ton
        </span>
      </div>

      <div className="space-y-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
        <div className="flex justify-between items-center font-bold text-emerald-700 dark:text-emerald-300">
          <span>🌾 UREA ({item.ureaPct}%)</span>
          <span className="font-mono">{formatNumber(item.ureaAlok)} Ton</span>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
          <span>• Realisasi: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatNumber(item.ureaReal)} T</strong></span>
          <span>• Sisa: <strong className="text-emerald-500 font-mono">{formatNumber(item.ureaSisa)} T</strong></span>
        </div>
      </div>

      <div className="space-y-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
        <div className="flex justify-between items-center font-bold text-blue-700 dark:text-blue-300">
          <span>🌱 NPK ({item.npkPct}%)</span>
          <span className="font-mono">{formatNumber(item.npkAlok)} Ton</span>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
          <span>• Realisasi: <strong className="text-blue-600 dark:text-blue-400 font-mono">{formatNumber(item.npkReal)} T</strong></span>
          <span>• Sisa: <strong className="text-blue-500 font-mono">{formatNumber(item.npkSisa)} T</strong></span>
        </div>
      </div>
    </div>
  )
}

function VisualPptsAllocationChart({ items }: { items: SpjbPptsItem[] }) {
  const [filterProd, setFilterProd] = useState<'ALL' | 'UREA' | 'NPK'>('ALL')
  const [chartStyle, setChartStyle] = useState<'line' | 'bar'>('line')

  const data = items.map((item) => {
    let uAlok = 0, uReal = 0, uSisa = 0
    let nAlok = 0, nReal = 0, nSisa = 0

    if (item.alokasiDetail && item.alokasiDetail.length > 0) {
      item.alokasiDetail.forEach(d => {
        const pName = (d.produk || '').toLowerCase()
        const alok = parseTonVal(d.alokasiSpjb)
        const real = parseTonVal(d.realisasi)
        const sisa = parseTonVal(d.sisaAlokasi) || Math.max(0, alok - real)

        if (pName.includes('urea')) {
          uAlok = alok; uReal = real; uSisa = sisa
        } else if (pName.includes('npk')) {
          nAlok = alok; nReal = real; nSisa = sisa
        }
      })
    } else if (item.detail?.alokasiTable?.rows) {
      item.detail.alokasiTable.rows.forEach(r => {
        const pName = (r[1] || r[0] || '').toLowerCase()
        const alok = parseTonVal(r[2])
        const real = parseTonVal(r[3])
        const sisa = Math.max(0, alok - real)

        if (pName.includes('urea')) {
          uAlok = alok; uReal = real; uSisa = sisa
        } else if (pName.includes('npk')) {
          nAlok = alok; nReal = real; nSisa = sisa
        }
      })
    }

    const totalAlok = uAlok + nAlok
    const totalReal = uReal + nReal
    const totalSisa = uSisa + nSisa

    let displayAlok = totalAlok
    let displayReal = totalReal
    let displaySisa = totalSisa

    if (filterProd === 'UREA') {
      displayAlok = uAlok
      displayReal = uReal
      displaySisa = uSisa
    } else if (filterProd === 'NPK') {
      displayAlok = nAlok
      displayReal = nReal
      displaySisa = nSisa
    }

    return {
      name: item.namaPpts || item.kodePpts,
      code: item.kodePpts,
      district: item.kabupaten,
      ureaReal: uReal,
      ureaSisa: uSisa,
      ureaAlok: uAlok,
      ureaPct: uAlok > 0 ? Math.round((uReal / uAlok) * 100) : 0,
      npkReal: nReal,
      npkSisa: nSisa,
      npkAlok: nAlok,
      npkPct: nAlok > 0 ? Math.round((nReal / nAlok) * 100) : 0,
      totalAlok: totalAlok,
      totalReal: totalReal,
      totalSisa: totalSisa,
      displayAlok: displayAlok,
      displayReal: displayReal,
      displaySisa: displaySisa,
    }
  })

  const chartWidth = Math.max(650, data.length * 60)

  return (
    <Card className="border border-purple-200 dark:border-purple-900 bg-gradient-to-b from-purple-50/20 via-background to-background" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Grafik Garis Alokasi, Realisasi & Sisa per PPTS
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tren garis komparasi Alokasi SPJB, Realisasi Tebusan, dan Sisa Alokasi per Kios PPTS (Ton)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Style Switcher (Garis / Batang) */}
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setChartStyle('line')}
                className={`px-2.5 py-1 rounded-md transition-all text-[11px] flex items-center gap-1 ${
                  chartStyle === 'line' ? 'bg-background text-purple-700 dark:text-purple-300 font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="h-3 w-3 text-purple-600" />
                <span>Garis</span>
              </button>
              <button
                onClick={() => setChartStyle('bar')}
                className={`px-2.5 py-1 rounded-md transition-all text-[11px] flex items-center gap-1 ${
                  chartStyle === 'bar' ? 'bg-background text-purple-700 dark:text-purple-300 font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="h-3 w-3 text-purple-600" />
                <span>Batang</span>
              </button>
            </div>

            {/* Product Filter Tabs */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setFilterProd('ALL')}
                className={`px-2.5 py-1 rounded-md transition-all text-[11px] ${
                  filterProd === 'ALL' ? 'bg-purple-600 text-white font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Semua Produk
              </button>
              <button
                onClick={() => setFilterProd('UREA')}
                className={`px-2.5 py-1 rounded-md transition-all text-[11px] ${
                  filterProd === 'UREA' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🌾 Urea
              </button>
              <button
                onClick={() => setFilterProd('NPK')}
                className={`px-2.5 py-1 rounded-md transition-all text-[11px] ${
                  filterProd === 'NPK' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🌱 NPK
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="w-full overflow-x-auto">
          <div style={{ width: chartWidth, height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartStyle === 'line' ? (
                /* GRAFIK GARIS (LINE CHART) */
                <LineChart data={data} margin={{ top: 20, right: 15, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: 'currentColor' }} height={60} />
                  <YAxis unit=" T" tick={{ fontSize: 10, fill: 'currentColor' }} width={45} />
                  <RechartsTooltip content={<CustomPptsTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="displayAlok"
                    name="📋 Alokasi SPJB (Ton)"
                    stroke="#9333ea"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#9333ea', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="displayReal"
                    name="✅ Realisasi Tebusan (Ton)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="displaySisa"
                    name="⏳ Sisa Alokasi (Ton)"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : (
                /* GRAFIK BATANG (BAR CHART) */
                <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 50 }} barCategoryGap={10}>
                  <defs>
                    <linearGradient id="alokGradPpts" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#7e22ce" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="realGradPpts" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#047857" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="sisaGradPpts" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#d97706" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: 'currentColor' }} height={60} />
                  <YAxis unit=" T" tick={{ fontSize: 10, fill: 'currentColor' }} width={45} />
                  <RechartsTooltip content={<CustomPptsTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                  <Bar dataKey="displayAlok" name="📋 Alokasi (Ton)" fill="url(#alokGradPpts)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="displayReal" name="✅ Realisasi (Ton)" fill="url(#realGradPpts)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="displaySisa" name="⏳ Sisa Alokasi (Ton)" fill="url(#sisaGradPpts)" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function MonitoringPptsView() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [showChart, setShowChart] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'cards'>('table')
  const [sortField, setSortField] = useState<'spjb' | 'urea' | 'npk' | 'total' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: spjbRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['spjbPpts', search, statusFilter],
    queryFn: () => fetchSpjbPpts({ search, status: statusFilter }),
  })

  const items = spjbRes?.data || []
  const totalSpjb = spjbRes?.total || 0
  const scrapedAt = spjbRes?.scraped_at ? new Date(spjbRes.scraped_at).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : '18 Agu 2026, 23.51 WIB'

  // Recalculate Totals mathematically across all items from alokasiDetail or fallback rows
  let totalUreaAlok = 0
  let totalUreaReal = 0
  let totalNpkAlok = 0
  let totalNpkReal = 0
  let totalOrganikAlok = 0
  let totalOrganikReal = 0

  items.forEach(item => {
    const details = item.alokasiDetail && item.alokasiDetail.length > 0
      ? item.alokasiDetail
      : (item.detail?.alokasiTable?.rows || []).map(r => ({
          produk: r[1] || r[0] || '',
          alokasiSpjb: r[2],
          realisasi: r[3],
        }))

    details.forEach(d => {
      const prod = (d.produk || '').toLowerCase()
      const alok = parseTonVal(d.alokasiSpjb)
      const real = parseTonVal(d.realisasi)

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

  const handleManualRefresh = async () => {
    setIsSyncing(true)
    try {
      await fetch('/api/gowcm/sync-spjb-ppts', { method: 'POST' })
      await refetch()
    } catch (err) {
      console.error('Failed manual sync:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const toggleSort = (field: 'spjb' | 'urea' | 'npk' | 'total') => {
    if (sortField === field) {
      if (sortOrder === 'desc') {
        setSortOrder('asc')
      } else {
        setSortField(null)
      }
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  // Sort items according to sortField & sortOrder (Sorting by % for Urea, NPK, Total)
  const getItemUreaPct = (item: SpjbPptsItem) => {
    let alok = 0, real = 0
    if (item.alokasiDetail && item.alokasiDetail.length > 0) {
      item.alokasiDetail.forEach(d => {
        if ((d.produk || '').toLowerCase().includes('urea')) {
          alok = parseTonVal(d.alokasiSpjb)
          real = parseTonVal(d.realisasi)
        }
      })
    } else if (item.detail?.alokasiTable?.rows) {
      item.detail.alokasiTable.rows.forEach(r => {
        if ((r[1] || r[0] || '').toLowerCase().includes('urea')) {
          alok = parseTonVal(r[2])
          real = parseTonVal(r[3])
        }
      })
    }
    return alok > 0 ? (real / alok) * 100 : 0
  }

  const getItemNpkPct = (item: SpjbPptsItem) => {
    let alok = 0, real = 0
    if (item.alokasiDetail && item.alokasiDetail.length > 0) {
      item.alokasiDetail.forEach(d => {
        if ((d.produk || '').toLowerCase().includes('npk')) {
          alok = parseTonVal(d.alokasiSpjb)
          real = parseTonVal(d.realisasi)
        }
      })
    } else if (item.detail?.alokasiTable?.rows) {
      item.detail.alokasiTable.rows.forEach(r => {
        if ((r[1] || r[0] || '').toLowerCase().includes('npk')) {
          alok = parseTonVal(r[2])
          real = parseTonVal(r[3])
        }
      })
    }
    return alok > 0 ? (real / alok) * 100 : 0
  }

  const getItemTotalPct = (item: SpjbPptsItem) => {
    let uAlok = 0, uReal = 0, nAlok = 0, nReal = 0
    if (item.alokasiDetail && item.alokasiDetail.length > 0) {
      item.alokasiDetail.forEach(d => {
        const pName = (d.produk || '').toLowerCase()
        const alok = parseTonVal(d.alokasiSpjb)
        const real = parseTonVal(d.realisasi)
        if (pName.includes('urea')) { uAlok = alok; uReal = real }
        else if (pName.includes('npk')) { nAlok = alok; nReal = real }
      })
    } else if (item.detail?.alokasiTable?.rows) {
      item.detail.alokasiTable.rows.forEach(r => {
        const pName = (r[1] || r[0] || '').toLowerCase()
        const alok = parseTonVal(r[2])
        const real = parseTonVal(r[3])
        if (pName.includes('urea')) { uAlok = alok; uReal = real }
        else if (pName.includes('npk')) { nAlok = alok; nReal = real }
      })
    }
    const totAlok = uAlok + nAlok
    const totReal = uReal + nReal
    return totAlok > 0 ? (totReal / totAlok) * 100 : 0
  }

  const sortedItems = [...items].sort((a, b) => {
    if (!sortField) return 0

    let valA: any = 0
    let valB: any = 0

    if (sortField === 'spjb') {
      valA = a.nomorSpjb || ''
      valB = b.nomorSpjb || ''
    } else if (sortField === 'urea') {
      valA = getItemUreaPct(a)
      valB = getItemUreaPct(b)
    } else if (sortField === 'npk') {
      valA = getItemNpkPct(a)
      valB = getItemNpkPct(b)
    } else if (sortField === 'total') {
      valA = getItemTotalPct(a)
      valB = getItemTotalPct(b)
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // 🎯 20 Baris per halaman untuk tampilan tabel
  const ITEMS_PER_PAGE = viewMode === 'table' ? 20 : 9
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pagedItems = sortedItems.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  const statusOptions = ['ALL', 'Active', 'Draft', 'Rejected']

  const renderSortIcon = (field: 'spjb' | 'urea' | 'npk' | 'total') => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-purple-600 dark:text-purple-400 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-purple-600 dark:text-purple-400 ml-1 inline" />
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Card className="border-l-2 border-l-purple-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Monitoring SPJB PPTS (Kontrak Kios GOW CM)
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                  GOW CM Alokasi
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
                  placeholder="Cari kios / Kode PPTS / SPJB..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 h-9 w-full sm:w-60"
                />
              </div>

              {/* View Switcher Toggle */}
              <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                <button
                  onClick={() => { setViewMode('table'); setPage(1) }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'table'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Tampilan Tabel (20 Baris)"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Tabel (20 Row)</span>
                </button>
                <button
                  onClick={() => { setViewMode('chart'); setPage(1) }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'chart'
                      ? 'bg-background text-foreground shadow-sm shadow-purple-500/10 text-purple-700 dark:text-purple-300 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Tampilan Grafik Alokasi, Realisasi & Sisa"
                >
                  <PieChart className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Grafik</span>
                </button>
                <button
                  onClick={() => { setViewMode('cards'); setPage(1) }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'cards'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Tampilan Kartu"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Kartu</span>
                </button>
              </div>

              <Button onClick={handleManualRefresh} disabled={isFetching || isSyncing} size="sm" variant="outline" className="h-9 gap-1.5 shrink-0 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30">
                <RefreshCw className={`h-3.5 w-3.5 text-purple-600 ${isFetching || isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Memutakhirkan...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* Summary KPI Cards */}
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

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-30 mb-3" />
              <p className="text-sm font-medium">Belum ada data SPJB PPTS yang sesuai</p>
              <p className="text-xs opacity-70 mt-1">Pastikan scraper spjb_ppts.js sudah pernah dijalankan</p>
            </div>
          ) : (
            <>
              {/* 📊 GRAFIK ALOKASI, REALISASI & SISA PER PPTS (SELALU NAMPARK / PERMANEN) */}
              {(showChart || viewMode === 'chart') && (
                <VisualPptsAllocationChart items={sortedItems} />
              )}

              {viewMode === 'chart' ? null : viewMode === 'table' ? (
            /* TABEL KONTRAK KIOS PPTS (20 BARIS & SORTABLE) */
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-border/60 shadow-sm bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border/70 text-muted-foreground font-semibold">
                      <th className="py-3 px-3 text-center w-10">#</th>
                      <th className="py-3 px-3">Nama Kios & Kode PPTS</th>
                      <th
                        onClick={() => toggleSort('spjb')}
                        className="py-3 px-3 cursor-pointer hover:bg-muted/80 transition-colors select-none"
                      >
                        Nomor SPJB {renderSortIcon('spjb')}
                      </th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th
                        onClick={() => toggleSort('urea')}
                        className="py-3 px-3 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-center cursor-pointer hover:bg-emerald-500/10 transition-colors select-none"
                      >
                        🌾 UREA (Alok / Real / Sisa) {renderSortIcon('urea')}
                      </th>
                      <th
                        onClick={() => toggleSort('npk')}
                        className="py-3 px-3 bg-blue-500/5 text-blue-700 dark:text-blue-300 text-center cursor-pointer hover:bg-blue-500/10 transition-colors select-none"
                      >
                        🌱 NPK (Alok / Real / Sisa) {renderSortIcon('npk')}
                      </th>
                      <th
                        onClick={() => toggleSort('total')}
                        className="py-3 px-3 text-center bg-purple-500/5 text-purple-700 dark:text-purple-300 cursor-pointer hover:bg-purple-500/10 transition-colors select-none"
                      >
                        📊 Total Realisasi {renderSortIcon('total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {pagedItems.map((item, idx) => {
                      const status = item.status || item.detail?.header?.status || 'Active'
                      let statusBadgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      if (status.toLowerCase() === 'rejected' || status.toLowerCase() === 'ditolak') {
                        statusBadgeClass = 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                      } else if (status.toLowerCase() === 'draft') {
                        statusBadgeClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }

                      // Extract Urea & NPK specs
                      let uAlok = 0, uReal = 0, uSisa = 0
                      let nAlok = 0, nReal = 0, nSisa = 0

                      if (item.alokasiDetail && item.alokasiDetail.length > 0) {
                        item.alokasiDetail.forEach(d => {
                          const pName = (d.produk || '').toLowerCase()
                          const alok = parseTonVal(d.alokasiSpjb)
                          const real = parseTonVal(d.realisasi)
                          const sisa = parseTonVal(d.sisaAlokasi) || Math.max(0, alok - real)

                          if (pName.includes('urea')) {
                            uAlok = alok; uReal = real; uSisa = sisa
                          } else if (pName.includes('npk')) {
                            nAlok = alok; nReal = real; nSisa = sisa
                          }
                        })
                      } else if (item.detail?.alokasiTable?.rows) {
                        item.detail.alokasiTable.rows.forEach(r => {
                          const pName = (r[1] || r[0] || '').toLowerCase()
                          const alok = parseTonVal(r[2])
                          const real = parseTonVal(r[3])
                          const sisa = Math.max(0, alok - real)

                          if (pName.includes('urea')) {
                            uAlok = alok; uReal = real; uSisa = sisa
                          } else if (pName.includes('npk')) {
                            nAlok = alok; nReal = real; nSisa = sisa
                          }
                        })
                      }

                      const uPct = uAlok > 0 ? Math.round((uReal / uAlok) * 100) : 0
                      const nPct = nAlok > 0 ? Math.round((nReal / nAlok) * 100) : 0

                      const totAlok = uAlok + nAlok
                      const totReal = uReal + nReal
                      const totPct = totAlok > 0 ? Math.round((totReal / totAlok) * 100) : 0

                      const globalIdx = (safePage - 1) * ITEMS_PER_PAGE + idx + 1

                      return (
                        <tr key={`${item.kodePpts}_${idx}`} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3 text-center text-muted-foreground font-mono font-medium">
                            {globalIdx}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-purple-600 shrink-0" />
                              <div>
                                <span className="font-bold text-foreground block truncate max-w-[200px]" title={item.namaPpts}>
                                  {item.namaPpts}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {item.kodePpts} {item.kabupaten ? `• ${item.kabupaten}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="font-mono text-[10px] bg-background font-semibold">
                              {item.nomorSpjb || '-'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${statusBadgeClass}`}>
                              {status}
                            </Badge>
                          </td>
                          {/* UREA */}
                          <td className="py-2.5 px-3 bg-emerald-500/5">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                  {formatNumber(uReal)} / {formatNumber(uAlok)} Ton
                                </span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-800 font-bold">
                                  {uPct}%
                                </Badge>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(uPct, 100)}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground block text-right">Sisa: {formatNumber(uSisa)} Ton</span>
                            </div>
                          </td>
                          {/* NPK */}
                          <td className="py-2.5 px-3 bg-blue-500/5">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                                  {formatNumber(nReal)} / {formatNumber(nAlok)} Ton
                                </span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-100 text-blue-800 font-bold">
                                  {nPct}%
                                </Badge>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(nPct, 100)}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground block text-right">Sisa: {formatNumber(nSisa)} Ton</span>
                            </div>
                          </td>
                          {/* TOTAL */}
                          <td className="py-2.5 px-3 text-center bg-purple-500/5">
                            <div className="inline-flex flex-col items-center">
                              <Badge className="bg-purple-600 text-white font-bold text-[11px] px-2 py-0.5">
                                {totPct}% Realisasi
                              </Badge>
                              <span className="text-[10px] font-mono font-semibold text-muted-foreground mt-1">
                                {formatNumber(totReal)} / {formatNumber(totAlok)} Ton
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Menampilkan {(safePage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(safePage * ITEMS_PER_PAGE, sortedItems.length)} dari {sortedItems.length} kontrak kios
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
          ) : (
            /* TAMPILAN KARTU KIOS */
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
                    Menampilkan {(safePage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(safePage * ITEMS_PER_PAGE, sortedItems.length)} dari {sortedItems.length} kontrak
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
          </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
