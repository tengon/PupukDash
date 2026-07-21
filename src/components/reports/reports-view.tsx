'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchMonthlyReport,
  type MonthlyReportData,
} from '@/lib/api'
import {
  formatRupiah,
  formatNumber,
  getTypeBadgeColor,
} from '@/lib/format'
import { exportToCSV } from '@/lib/export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
              value={`${formatNumber(report.summary.totalKgSold)} kg`}
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
              value={`${formatNumber(avgKgPerOrder)} kg`}
              borderColor="border-l-teal-600"
            />
          </div>

          {/* Daily Sales Mini Chart */}
          <DailySalesChart dailySales={report.dailySales} />

          {/* Print Header (visible on screen for report context) */}
          <div className="print:block hidden" />

          {/* Tabbed Tables */}
          <Tabs defaultValue="product" className="print-page-break">
            <TabsList>
              <TabsTrigger value="product">Per Produk</TabsTrigger>
              <TabsTrigger value="warehouse">Per Gudang</TabsTrigger>
              <TabsTrigger value="farmer">Top Petani</TabsTrigger>
            </TabsList>

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