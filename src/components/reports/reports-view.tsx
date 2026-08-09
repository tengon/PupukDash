'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchMonthlyReport,
  fetchPptsList,
  type MonthlyReportData,
  type Ppts,
} from '@/lib/api'
import {
  formatRupiah,
  formatNumber,
  getTypeBadgeColor,
} from '@/lib/format'
import { exportToCSV } from '@/lib/export'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import {
  Printer,
  Download,
  ShoppingCart,
  Package,
  Banknote,
  HandCoins,
  Users,
  Calculator,
  AlertCircle,
  Store,
  Search,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
]

const YEARS = ['2024', '2025', '2026', '2027']

function getDefaultMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>

      {/* Daily chart skeleton */}
      <Skeleton className="h-32 w-full rounded-lg" />

      {/* Tabs skeleton */}
      <Skeleton className="h-9 w-64" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}

// ─── Daily Sales Mini Chart ──────────────────────────────────────────────────

function DailySalesChart({ dailySales }: { dailySales: MonthlyReportData['dailySales'] }) {
  const maxRevenue = useMemo(
    () => Math.max(...dailySales.map((d) => d.revenue), 1),
    [dailySales],
  )

  // Build an array of 31 entries (1-indexed day), fill missing with zeros
  const days = useMemo(() => {
    const map = new Map(dailySales.map((d) => [new Date(d.date).getDate(), d]))
    // Determine month/year for weekend detection
    const sampleDate = dailySales.length > 0 ? new Date(dailySales[0].date) : new Date()
    const month = sampleDate.getMonth()
    const year = sampleDate.getFullYear()
    return Array.from({ length: 31 }, (_, i) => {
      const day = i + 1
      const sale = map.get(day)
      const dateObj = new Date(year, month, day)
      const dayOfWeek = dateObj.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      return {
        day,
        orders: sale?.orders ?? 0,
        kg: sale?.kg ?? 0,
        revenue: sale?.revenue ?? 0,
        isWeekend,
      }
    })
  }, [dailySales])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Penjualan Harian
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end gap-[2px] h-24 print:h-16">
          {days.map((d) => {
            const height = d.revenue > 0 ? Math.max((d.revenue / maxRevenue) * 100, 4) : 2
            return (
              <div
                key={d.day}
                className="group relative flex-1 flex flex-col items-center justify-end h-full"
              >
                {/* Tooltip */}
                {d.revenue > 0 && (
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                    <div className="bg-popover text-popover-foreground border rounded-md shadow-md px-2 py-1 text-[10px] whitespace-nowrap">
                      <div className="font-medium">Tgl {d.day}</div>
                      <div>{formatRupiah(d.revenue)}</div>
                      <div>{formatNumber(d.kg)} kg · {d.orders} pesanan</div>
                    </div>
                  </div>
                )}
                <div
                  className={`w-full rounded-t-md transition-all duration-200 ${
                    d.revenue > 0
                      ? d.isWeekend
                        ? 'bg-green-600/60 hover:bg-green-600 dark:bg-green-400/50 dark:hover:bg-green-400'
                        : 'bg-green-500/80 hover:bg-green-500 dark:hover:bg-green-400'
                      : 'bg-muted-foreground/10'
                  }`}
                  style={{ height: `${height}%` }}
                />
                {d.day % 5 === 1 && (
                  <span className="text-[8px] text-muted-foreground/60 mt-0.5">{d.day}</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-muted-foreground">1</span>
          <span className="text-[9px] text-muted-foreground">15</span>
          <span className="text-[9px] text-muted-foreground">31</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  borderColor,
}: {
  icon: typeof ShoppingCart
  label: string
  value: string
  borderColor: string
}) {
  return (
    <Card className={`card-highlight border-l-4 ${borderColor}`}>
      <CardContent className="p-3 flex items-start gap-2.5">
        <div className="mt-0.5 text-muted-foreground transition-transform duration-200 hover:scale-110">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
          <p className="text-sm font-semibold font-mono tabular-nums truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

type AllocationMetric = {
  alokasi: number
  realisasi: number
  sisa: number
}

type AllocationChartRow = {
  id: string
  label: string
  subtitle?: string
  urea: AllocationMetric
  npk: AllocationMetric
}

function getPptsAllocationMetrics(item: Ppts) {
  const alokasiUrea = item.alokasiUrea || 0
  const realisasiUrea = item.realisasiUrea || 0
  const sisaUrea = Math.max(0, item.sisaUrea ?? (alokasiUrea - realisasiUrea))

  const alokasiNpk = item.alokasiNpk || 0
  const realisasiNpk = item.realisasiNpk || 0
  const sisaNpk = Math.max(0, item.sisaNpk ?? (alokasiNpk - realisasiNpk))

  return {
    urea: { alokasi: alokasiUrea, realisasi: realisasiUrea, sisa: sisaUrea },
    npk: { alokasi: alokasiNpk, realisasi: realisasiNpk, sisa: sisaNpk },
  }
}

function getMaxAllocationValue(rows: AllocationChartRow[]) {
  const values = rows.flatMap((row) => [
    row.urea.alokasi,
    row.urea.realisasi,
    row.urea.sisa,
    row.npk.alokasi,
    row.npk.realisasi,
    row.npk.sisa,
  ])
  return Math.max(1, ...values)
}

function formatTon(value: number) {
  return value.toLocaleString('id-ID', { maximumFractionDigits: 1 })
}

function VisualAllocationChart({
  title,
  description,
  rows,
}: {
  title: string
  description?: string
  rows: AllocationChartRow[]
}) {
  const data = rows.map((r) => ({
    name:          r.label,
    subtitle:      r.subtitle,
    ureaRealisasi: r.urea.realisasi,
    ureaSisa:      r.urea.sisa,
    ureaAlokasi:   r.urea.alokasi,
    npkRealisasi:  r.npk.realisasi,
    npkSisa:       r.npk.sisa,
    npkAlokasi:    r.npk.alokasi,
    totalAlokasi:  r.urea.alokasi + r.npk.alokasi,
  }))

  const chartWidth = Math.max(500, data.length * 70)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const item = payload[0].payload
    return (
      <div className="bg-popover text-popover-foreground border border-border rounded-xl p-3 shadow-lg text-xs space-y-2 max-w-xs min-w-[220px]">
        <div className="border-b border-border/60 pb-1.5">
          <p className="font-bold text-sm text-foreground">{item.name}</p>
          {item.subtitle && <p className="text-[10px] text-muted-foreground">{item.subtitle}</p>}
        </div>

        {/* Total Alokasi Summary */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 flex justify-between items-center">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Total Alokasi</span>
          <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
            {item.totalAlokasi.toLocaleString('id-ID')} Ton
          </span>
        </div>

        {/* UREA Breakdown */}
        <div className="space-y-1 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
          <div className="flex justify-between items-center font-bold text-amber-700 dark:text-amber-300">
            <span>🌾 UREA Alokasi</span>
            <span className="font-mono">{item.ureaAlokasi.toLocaleString('id-ID')} Ton</span>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
            <span>• Realisasi: <strong className="text-amber-600 dark:text-amber-400 font-mono">{item.ureaRealisasi.toLocaleString('id-ID')} T</strong></span>
            <span>• Sisa: <strong className="text-amber-500 font-mono">{item.ureaSisa.toLocaleString('id-ID')} T</strong></span>
          </div>
        </div>

        {/* NPK Breakdown */}
        <div className="space-y-1 bg-emerald-600/10 border border-emerald-600/20 rounded-lg p-2">
          <div className="flex justify-between items-center font-bold text-emerald-700 dark:text-emerald-300">
            <span>🌱 NPK Alokasi</span>
            <span className="font-mono">{item.npkAlokasi.toLocaleString('id-ID')} Ton</span>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
            <span>• Realisasi: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{item.npkRealisasi.toLocaleString('id-ID')} T</strong></span>
            <span>• Sisa: <strong className="text-emerald-500 font-mono">{item.npkSisa.toLocaleString('id-ID')} T</strong></span>
          </div>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Tidak ada data untuk divisualisasikan
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div style={{ width: chartWidth, height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
                barCategoryGap={8}
              >
                <defs>
                  <linearGradient id="ureaRealGradRep" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#d97706" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="ureaSisaGradRep" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#fde047" stopOpacity={0.95} />
                  </linearGradient>
                  <linearGradient id="npkRealGradRep" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#047857" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="npkSisaGradRep" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#a7f3d0" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                <XAxis
                  dataKey="name"
                  angle={-90}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickMargin={4}
                  axisLine={{ stroke: '#9ca3af', strokeOpacity: 0.3 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val.toLocaleString('id-ID')}
                />
                <RechartsTooltip
                  cursor={{ fill: 'currentColor', opacity: 0.06 }}
                  content={<CustomTooltip />}
                />
                <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                
                {/* UREA Stack */}
                <Bar dataKey="ureaRealisasi" name="🌾 UREA Realisasi" stackId="a" fill="url(#ureaRealGradRep)" barSize={22} stroke="#b45309" strokeWidth={0.5} radius={[0, 0, 3, 3]} />
                <Bar dataKey="ureaSisa"      name="🌾 UREA Sisa"      stackId="a" fill="url(#ureaSisaGradRep)" barSize={22} stroke="#d97706" strokeWidth={0.5} radius={[5, 5, 0, 0]} />
                
                {/* NPK Stack */}
                <Bar dataKey="npkRealisasi"  name="🌱 NPK Realisasi"  stackId="b" fill="url(#npkRealGradRep)" barSize={22} stroke="#065f46" strokeWidth={0.5} radius={[0, 0, 3, 3]} />
                <Bar dataKey="npkSisa"       name="🌱 NPK Sisa"       stackId="b" fill="url(#npkSisaGradRep)" barSize={22} stroke="#047857" strokeWidth={0.5} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AllocationMetricBars({
  product,
  metric,
  maxValue,
  productClassName,
}: {
  product: 'UREA' | 'NPK'
  metric: AllocationMetric
  maxValue: number
  productClassName: string
}) {
  const alokasiWidth = Math.max(1, (metric.alokasi / maxValue) * 100)
  
  // Calculate percentages so they fill the alokasi container properly
  const total = metric.realisasi + metric.sisa || 1
  const realisasiPct = metric.alokasi > 0 ? (metric.realisasi / metric.alokasi) * 100 : (metric.realisasi / total) * 100
  const sisaPct = metric.alokasi > 0 ? (metric.sisa / metric.alokasi) * 100 : (metric.sisa / total) * 100

  return (
    <div className="rounded-md border bg-background/80 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="outline" className={`h-5 px-2 text-[10px] font-bold ${productClassName}`}>
          {product}
        </Badge>
        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
          Alokasi: {formatTon(metric.alokasi)} T
        </span>
      </div>
      <div className="space-y-1.5 mt-2">
        <div className="flex justify-between text-[10px] font-semibold px-0.5">
          <span className="text-blue-600 dark:text-blue-400">Real: {formatTon(metric.realisasi)}</span>
          <span className="text-amber-600 dark:text-amber-400">Sisa: {formatTon(metric.sisa)}</span>
        </div>
        
        {/* Full width container representing maxValue */}
        <div className="h-3.5 w-full bg-muted/50 rounded-full overflow-hidden">
          {/* The Stacked Bar representing Alokasi */}
          <div 
            className="h-full flex overflow-hidden rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40"
            style={{ width: `${alokasiWidth}%` }}
            title={`Alokasi: ${formatTon(metric.alokasi)} T`}
          >
            {/* Realisasi Bar */}
            <div 
              className="h-full bg-blue-500 transition-all duration-500 hover:brightness-110"
              style={{ width: `${realisasiPct}%` }}
              title={`Realisasi: ${formatTon(metric.realisasi)} T`}
            />
            {/* Sisa Bar */}
            <div 
              className="h-full bg-amber-500 transition-all duration-500 hover:brightness-110"
              style={{ width: `${sisaPct}%` }}
              title={`Sisa: ${formatTon(metric.sisa)} T`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function AllocationBarChart({
  title,
  rows,
  emptyMessage,
}: {
  title: string
  rows: AllocationChartRow[]
  emptyMessage: string
}) {
  const maxValue = getMaxAllocationValue(rows)

  return (
    <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-emerald-500 bg-emerald-500/20" />Alokasi (Total)</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Realisasi</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Sisa</span>
            </div>
            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {rows.map((row) => (
                <div key={row.id} className="rounded-lg border bg-card/70 p-3">
                  <div className="mb-2 min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{row.label}</p>
                    {row.subtitle && (
                      <p className="truncate text-[10px] text-muted-foreground">{row.subtitle}</p>
                    )}
                  </div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    <AllocationMetricBars
                      product="UREA"
                      metric={row.urea}
                      maxValue={maxValue}
                      productClassName="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                    />
                    <AllocationMetricBars
                      product="NPK"
                      metric={row.npk}
                      maxValue={maxValue}
                      productClassName="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ReportsView() {
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth)

  const monthValue = selectedMonth.slice(5)
  const yearValue = selectedMonth.slice(0, 4)

  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['monthly-report', selectedMonth],
    queryFn: () => fetchMonthlyReport(selectedMonth),
  })

  const m = MONTHS.find((m) => m.value === monthValue)
  const periodLabel = m ? `${m.label.toUpperCase()} ${yearValue}` : selectedMonth

  // ─── CSV Download ─────────────────────────────────────────────────────────
  const handleDownloadCSV = () => {
    if (!report) return

    const filename = `laporan-bulanan-${selectedMonth}`

    // Product rows
    const productHeaders = [
      'Produk', 'Jenis', 'Terjual (kg)', 'Pendapatan (Rp)',
      'Subsidi (Rp)', 'Pesanan', 'Harga Rata²/kg',
    ]
    const productRows = report.byProduct.map((p) => [
      p.productName,
      p.productType,
      p.totalKg,
      p.totalRevenue,
      p.totalSubsidy,
      p.orderCount,
      p.avgPricePerKg,
    ])

    // Warehouse rows
    const warehouseHeaders = [
      'Kode', 'Gudang', 'Pesanan', 'Terjual (kg)', 'Pendapatan (Rp)', 'Subsidi (Rp)',
    ]
    const warehouseRows = report.byWarehouse.map((w) => [
      w.warehouseCode,
      w.warehouseName,
      w.totalOrders,
      w.totalKg,
      w.totalRevenue,
      w.totalSubsidy,
    ])

    // Farmer rows
    const farmerHeaders = [
      'No', 'Nama', 'NIK', 'Pesanan', 'Total (kg)', 'Total (Rp)', 'Subsidi (Rp)',
    ]
    const farmerRows = report.topFarmers.map((f, i) => [
      i + 1,
      f.farmerName,
      f.farmerNik,
      f.totalOrders,
      f.totalKg,
      f.totalAmount,
      f.totalSubsidy,
    ])

    // Combine into one CSV with section headers
    const allRows: (string | number | null | undefined)[][] = [
      [`LAPORAN BULANAN — ${periodLabel}`],
      [],
      ['== RINGKASAN =='],
      ['Total Pesanan', report.summary.totalOrders],
      ['Pesanan Selesai', report.summary.completedOrders],
      ['Pesanan Dibatalkan', report.summary.cancelledOrders],
      ['Total Berat Terjual (kg)', report.summary.totalKgSold],
      ['Total Pendapatan (Rp)', report.summary.totalRevenue],
      ['Total Subsidi (Rp)', report.summary.totalSubsidy],
      ['Petani Dilayani', report.summary.totalFarmersServed],
      [],
      ['== PER PRODUK =='],
      ...productRows.map((r) => r as (string | number)[]),
      [],
      ['== PER GUDANG =='],
      ...warehouseRows.map((r) => r as (string | number)[]),
      [],
      ['== TOP PETANI =='],
      ...farmerRows.map((r) => r as (string | number)[]),
    ]

    exportToCSV(filename, ['Laporan Bulanan SiPUPUK'], allRows)
  }

  // ─── Avg kg per order ────────────────────────────────────────────────────
  const avgKgPerOrder = report
    ? report.summary.totalOrders > 0
      ? Math.round(report.summary.totalKgSold / report.summary.totalOrders)
      : 0
    : 0

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Hide everything except the report content */
          aside, nav, header, footer,
          .print\\:hidden,
          [data-slot="sidebar"],
          button.print\\:hidden,
          .no-print {
            display: none !important;
          }
          /* Ensure report header shows */
          .print-header {
            display: block !important;
          }
          /* Clean white background */
          body, .print\\:bg-white {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Page breaks */
          .print-page-break {
            page-break-before: always;
          }
          /* Table borders in print */
          table, th, td {
            border: 1px solid #ccc !important;
            border-collapse: collapse !important;
          }
          th, td {
            padding: 4px 8px !important;
            font-size: 11px !important;
          }
          /* Remove shadows, rounded corners for print */
          .rounded-lg, .rounded-md {
            border-radius: 0 !important;
          }
          .shadow-sm, .shadow, .shadow-md {
            box-shadow: none !important;
          }
          /* Full width */
          main, .print-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Bulanan</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan penjualan pupuk bersubsidi per bulan
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <Select
              value={monthValue}
              onValueChange={(v) =>
                setSelectedMonth(`${yearValue}-${v}`)
              }
            >
              <SelectTrigger className="w-[130px] h-9 text-sm">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={yearValue}
              onValueChange={(v) =>
                setSelectedMonth(`${v}-${monthValue}`)
              }
            >
              <SelectTrigger className="w-[90px] h-9 text-sm">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-9 gap-1.5 btn-gradient print:hidden"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Cetak Laporan</span>
              <span className="sm:hidden">Cetak</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={handleDownloadCSV}
              disabled={!report}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Loading ─────────────────────────────────────────────────────────── */}
      {isLoading && <ReportSkeleton />}

      {/* ─── Error ───────────────────────────────────────────────────────────── */}
      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Gagal memuat laporan
              </p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : 'Terjadi kesalahan'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Report Content ──────────────────────────────────────────────────── */}
      {report && (
        <div className="space-y-4">
          {/* Print Header — hidden on screen, shown in print */}
          <div className="hidden print-header">
            <div className="text-center mb-4">
              <h1 className="text-lg font-bold">
                SiPUPUK — Sistem Informasi Penjualan Pupuk Bersubsidi
              </h1>
              <p className="text-xs text-muted-foreground">
                Distributor PPST
              </p>
              <p className="text-sm font-semibold mt-2">
                LAPORAN BULANAN — {periodLabel}
              </p>
              <hr className="mt-2 border-black" />
            </div>
          </div>

          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
            <SummaryCard
              icon={ShoppingCart}
              label="Total Pesanan"
              value={formatNumber(report.summary.totalOrders)}
              borderColor="border-l-green-500"
            />
            <SummaryCard
              icon={Package}
              label="Total Berat Terjual"
              value={`${formatNumber(Math.round(report.summary.totalKgSold / 1000))} Ton (${formatNumber(report.summary.totalKgSold)} kg)`}
              borderColor="border-l-emerald-500"
            />
            <SummaryCard
              icon={Banknote}
              label="Total Pendapatan"
              value={formatRupiah(report.summary.totalRevenue)}
              borderColor="border-l-teal-500"
            />
            <SummaryCard
              icon={HandCoins}
              label="Total Subsidi"
              value={formatRupiah(report.summary.totalSubsidy)}
              borderColor="border-l-lime-500"
            />
            <SummaryCard
              icon={Users}
              label="Petani Dilayani"
              value={formatNumber(report.summary.totalFarmersServed)}
              borderColor="border-l-green-600"
            />
            <SummaryCard
              icon={Calculator}
              label="Rata-rata/Pesanan"
              value={`${formatNumber(Math.round((avgKgPerOrder / 1000) * 10) / 10)} Ton (${formatNumber(avgKgPerOrder)} kg)`}
              borderColor="border-l-teal-600"
            />
          </div>

          {/* Daily Sales Mini Chart */}
          <DailySalesChart dailySales={report.dailySales} />

          {/* Print Header (visible on screen for report context) */}
          <div className="print:block hidden" />

          {/* Tabbed Tables */}
          <Tabs defaultValue="ppts-stock" className="print-page-break">
            <TabsList>
              <TabsTrigger value="ppts-stock" className="font-semibold text-emerald-700 dark:text-emerald-300">Stok & Alokasi PPTS (WCM)</TabsTrigger>
              <TabsTrigger value="product">Per Produk</TabsTrigger>
              <TabsTrigger value="warehouse">Per Gudang</TabsTrigger>
              <TabsTrigger value="farmer">Top Petani</TabsTrigger>
            </TabsList>

            {/* ─── Tab: Stok & Alokasi PPTS ────────────────────────────────────── */}
            <TabsContent value="ppts-stock">
              <PptsStockTab />
            </TabsContent>

            {/* ─── Tab: Per Produk ────────────────────────────────────────────── */}
            <TabsContent value="product" className="mt-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Penjualan per Produk — {periodLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Produk</TableHead>
                          <TableHead className="text-xs">Jenis</TableHead>
                          <TableHead className="text-xs text-right">Terjual (kg)</TableHead>
                          <TableHead className="text-xs text-right">Pendapatan (Rp)</TableHead>
                          <TableHead className="text-xs text-right">Subsidi (Rp)</TableHead>
                          <TableHead className="text-xs text-right">Pesanan</TableHead>
                          <TableHead className="text-xs text-right">Harga Rata²/kg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.byProduct.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                              Tidak ada data produk
                            </TableCell>
                          </TableRow>
                        ) : (
                          report.byProduct.map((p, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-sm font-medium">
                                {p.productName}
                              </TableCell>
                              <TableCell className="text-sm">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${getTypeBadgeColor(p.productType)}`}
                                >
                                  {p.productType}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatNumber(p.totalKg)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatRupiah(p.totalRevenue)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatRupiah(p.totalSubsidy)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatNumber(p.orderCount)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatRupiah(p.avgPricePerKg)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Tab: Per Gudang ────────────────────────────────────────────── */}
            <TabsContent value="warehouse" className="mt-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Penjualan per Gudang — {periodLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Kode</TableHead>
                          <TableHead className="text-xs">Gudang</TableHead>
                          <TableHead className="text-xs text-right">Pesanan</TableHead>
                          <TableHead className="text-xs text-right">Terjual (kg)</TableHead>
                          <TableHead className="text-xs text-right">Pendapatan (Rp)</TableHead>
                          <TableHead className="text-xs text-right">Subsidi (Rp)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.byWarehouse.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                              Tidak ada data gudang
                            </TableCell>
                          </TableRow>
                        ) : (
                          report.byWarehouse.map((w) => (
                            <TableRow key={w.warehouseId}>
                              <TableCell className="text-sm font-mono font-medium">
                                {w.warehouseCode}
                              </TableCell>
                              <TableCell className="text-sm">
                                {w.warehouseName}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatNumber(w.totalOrders)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatNumber(w.totalKg)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatRupiah(w.totalRevenue)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatRupiah(w.totalSubsidy)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Tab: Top Petani ────────────────────────────────────────────── */}
            <TabsContent value="farmer" className="mt-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Top Petani — {periodLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-10 text-center">#</TableHead>
                          <TableHead className="text-xs">Nama</TableHead>
                          <TableHead className="text-xs">NIK</TableHead>
                          <TableHead className="text-xs text-right">Pesanan</TableHead>
                          <TableHead className="text-xs text-right">Total (kg)</TableHead>
                          <TableHead className="text-xs text-right">Total (Rp)</TableHead>
                          <TableHead className="text-xs text-right">Subsidi (Rp)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.topFarmers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                              Tidak ada data petani
                            </TableCell>
                          </TableRow>
                        ) : (
                          report.topFarmers.map((f, idx) => (
                            <TableRow key={f.farmerId}>
                              <TableCell className="text-sm text-center font-mono text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {f.farmerName}
                              </TableCell>
                              <TableCell className="text-sm font-mono text-muted-foreground">
                                {f.farmerNik}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatNumber(f.totalOrders)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatNumber(f.totalKg)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatRupiah(f.totalAmount)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {formatRupiah(f.totalSubsidy)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </motion.div>
  )
}

// ─── PptsStockTab Component ──────────────────────────────────────────────────

function PptsStockTab() {
  const { data: pptsList } = useQuery({
    queryKey: ['ppts-report-list'],
    queryFn: async () => {
      let list = await fetchPptsList()
      if (!list || list.length === 0) {
        await fetch('/api/ppts/seed', { method: 'POST' }).catch(() => {})
        list = await fetchPptsList()
      }
      return list
    },
  })

  const [search, setSearch] = useState('')
  const [districtFilter, setDistrictFilter] = useState('all')

  const activeItems = useMemo(() => {
    return (pptsList || []).filter((p) => p.isActive)
  }, [pptsList])

  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      const matchDistrict = districtFilter === 'all' || item.district === districtFilter
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        (item.spjbNumber && item.spjbNumber.toLowerCase().includes(search.toLowerCase())) ||
        (item.district && item.district.toLowerCase().includes(search.toLowerCase()))
      return matchDistrict && matchSearch
    })
  }, [activeItems, districtFilter, search])

  // Summary Metrics
  const totalAlokasiUrea = useMemo(() => activeItems.reduce((sum, i) => sum + (i.alokasiUrea || 0), 0), [activeItems])
  const totalRealisasiUrea = useMemo(() => activeItems.reduce((sum, i) => sum + (i.realisasiUrea || 0), 0), [activeItems])
  const totalSisaUrea = useMemo(() => activeItems.reduce((sum, i) => sum + (i.sisaUrea ?? ((i.alokasiUrea || 0) - (i.realisasiUrea || 0))), 0), [activeItems])

  const totalAlokasiNpk = useMemo(() => activeItems.reduce((sum, i) => sum + (i.alokasiNpk || 0), 0), [activeItems])
  const totalRealisasiNpk = useMemo(() => activeItems.reduce((sum, i) => sum + (i.realisasiNpk || 0), 0), [activeItems])
  const totalSisaNpk = useMemo(() => activeItems.reduce((sum, i) => sum + (i.sisaNpk ?? ((i.alokasiNpk || 0) - (i.realisasiNpk || 0))), 0), [activeItems])

  const totalAlokasi = totalAlokasiUrea + totalAlokasiNpk
  const totalRealisasi = totalRealisasiUrea + totalRealisasiNpk
  const totalSisa = totalSisaUrea + totalSisaNpk

  const districtsList = useMemo(() => {
    const set = new Set<string>()
    activeItems.forEach((item) => {
      if (item.district) set.add(item.district)
    })
    return Array.from(set)
  }, [activeItems])

  const pptsAllocationRows = useMemo<AllocationChartRow[]>(() => {
    return filteredItems
      .map((item) => {
        const metrics = getPptsAllocationMetrics(item)
        return {
          id: item.id,
          label: item.name,
          subtitle: `${item.code} - Kec. ${item.district}`,
          ...metrics,
        }
      })
      .sort((a, b) => (b.urea.alokasi + b.npk.alokasi) - (a.urea.alokasi + a.npk.alokasi))
  }, [filteredItems])

  const districtAllocationRows = useMemo<AllocationChartRow[]>(() => {
    const map = new Map<string, AllocationChartRow>()

    filteredItems.forEach((item) => {
      const district = item.district || 'Tanpa Kecamatan'
      const metrics = getPptsAllocationMetrics(item)

      if (!map.has(district)) {
        map.set(district, {
          id: district,
          label: `Kec. ${district}`,
          subtitle: '0 PPTS',
          urea: { alokasi: 0, realisasi: 0, sisa: 0 },
          npk: { alokasi: 0, realisasi: 0, sisa: 0 },
        })
      }

      const row = map.get(district)!
      row.urea.alokasi += metrics.urea.alokasi
      row.urea.realisasi += metrics.urea.realisasi
      row.urea.sisa += metrics.urea.sisa
      row.npk.alokasi += metrics.npk.alokasi
      row.npk.realisasi += metrics.npk.realisasi
      row.npk.sisa += metrics.npk.sisa

      const count = filteredItems.filter((p) => (p.district || 'Tanpa Kecamatan') === district).length
      row.subtitle = `${count} PPTS`
    })

    return Array.from(map.values())
      .sort((a, b) => (b.urea.alokasi + b.npk.alokasi) - (a.urea.alokasi + a.npk.alokasi))
  }, [filteredItems])

  return (
    <div className="space-y-4 mt-2">
      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="h-[120px] border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <CardContent className="p-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Alokasi (SPJB)</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono mt-1">
              {totalAlokasi.toLocaleString('id-ID')} Ton
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              ({formatNumber(totalAlokasi * 1000)} kg)
            </p>
          </CardContent>
        </Card>

        <Card className="h-[120px] border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
          <CardContent className="p-2">
            <p className="pt-0.1 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Realisasi / Tebusan</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300 font-mono mt-1">
              {totalRealisasi.toLocaleString('id-ID')} Ton
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-md bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="block text-muted-foreground">UREA</span>
                <span className="font-mono font-bold">{formatTon(totalRealisasiUrea)} Ton</span>
              </div>
              <div className="rounded-md bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <span className="block text-muted-foreground">NPK</span>
                <span className="font-mono font-bold">{formatTon(totalRealisasiNpk)} Ton</span>
              </div>
            </div>
            {/*<p className="text-xs text-muted-foreground font-mono mt-0.5">
              ({formatNumber(totalRealisasi * 1000)} kg) · {totalAlokasi > 0 ? Math.round((totalRealisasi / totalAlokasi) * 100) : 0}% Tertebus
            </p>*/}
          </CardContent>
        </Card>

        <Card className="h-[120px] border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
          <CardContent className="p-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Sisa Alokasi</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300 font-mono mt-1">
              {totalSisa.toLocaleString('id-ID')} Ton
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-md bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="block text-muted-foreground">UREA</span>
                <span className="font-mono font-bold">{formatTon(totalSisaUrea)} Ton</span>
              </div>
              <div className="rounded-md bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <span className="block text-muted-foreground">NPK</span>
                <span className="font-mono font-bold">{formatTon(totalSisaNpk)} Ton</span>
              </div>
            </div>
            {/*<p className="text-xs text-muted-foreground font-mono mt-0.5">
              ({formatNumber(totalSisa * 1000)} kg)
            </p>*/}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Kios PPTS Active</p>
            <p className="text-xl font-bold text-teal-700 dark:text-teal-300 font-mono mt-1">
              {activeItems.length} Kios
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tersebar di {districtsList.length} Kecamatan
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <VisualAllocationChart
          title="Grafik Alokasi, Realisasi & Sisa per PPTS"
          rows={pptsAllocationRows}
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AllocationBarChart
            title="List Progress per PPTS"
            rows={pptsAllocationRows}
            emptyMessage="Tidak ada data PPTS untuk divisualisasikan"
          />
          <AllocationBarChart
            title="List Progress per Kecamatan"
            rows={districtAllocationRows}
            emptyMessage="Tidak ada data kecamatan untuk divisualisasikan"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Store className="h-5 w-5 text-emerald-600" />
                Daftar Stok & Alokasi SPJB PPTS (Official WCM Data)
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {filteredItems.length} Data PPTS
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Data kuota alokasi pupuk bersubsidi (Urea & NPK), realisasi tebusan, dan sisa alokasi resmi dari WCM Pupuk Indonesia
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Kecamatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kecamatan</SelectItem>
                  {districtsList.map((d) => (
                    <SelectItem key={d} value={d}>Kec. {d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari SPJB / PPTS / Kode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs w-48 sm:w-60"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="text-xs font-bold text-foreground">Nama PPTS</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Kode</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Kecamatan</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Produk</TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-right">Alokasi (Ton)</TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-right">Realisasi (Ton)</TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-right">Sisa Alokasi (Ton)</TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-center">% Serapan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      Tidak ada data PPTS yang cocok
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item, index) => {
                    const alokUrea = item.alokasiUrea || 0
                    const realUrea = item.realisasiUrea || 0
                    const sisaUrea = item.sisaUrea ?? (alokUrea - realUrea)
                    const pctUrea = alokUrea > 0 ? Math.round((realUrea / alokUrea) * 100) : 0

                    const alokNpk = item.alokasiNpk || 0
                    const realNpk = item.realisasiNpk || 0
                    const sisaNpk = item.sisaNpk ?? (alokNpk - realNpk)
                    const pctNpk = alokNpk > 0 ? Math.round((realNpk / alokNpk) * 100) : 0

                    const bgClass = index % 2 === 0 ? 'bg-background' : 'bg-muted/20'

                    return (
                      <React.Fragment key={item.id}>
                        {/* Row 1: UREA */}
                        <TableRow className={`${bgClass} border-t border-border/80 hover:bg-muted/40 transition-colors`}>
                          <TableCell rowSpan={2} className="align-middle font-bold text-xs text-foreground border-r border-border/30">
                            <div>{item.name}</div>
                            {item.spjbNumber && (
                              <div className="text-[10px] font-mono text-primary font-normal mt-0.5">{item.spjbNumber}</div>
                            )}
                          </TableCell>
                          <TableCell rowSpan={2} className="align-middle font-mono text-xs text-muted-foreground border-r border-border/30">
                            {item.code}
                          </TableCell>
                          <TableCell rowSpan={2} className="align-middle border-r border-border/30">
                            <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Kec. {item.district}
                            </Badge>
                          </TableCell>

                          {/* UREA Data */}
                          <TableCell className="font-bold text-xs text-amber-700 dark:text-amber-400">
                            UREA
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                            {alokUrea.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {realUrea.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
                            {sisaUrea.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            {pctUrea}%
                          </TableCell>
                        </TableRow>

                        {/* Row 2: NPK */}
                        <TableRow className={`${bgClass} border-b border-border/80 hover:bg-muted/40 transition-colors`}>
                          <TableCell className="font-bold text-xs text-rose-700 dark:text-rose-400">
                            NPK
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-rose-700 dark:text-rose-400">
                            {alokNpk.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {realNpk.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-rose-800 dark:text-rose-300">
                            {sisaNpk.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            {pctNpk}%
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
