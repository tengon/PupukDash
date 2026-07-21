'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchRPKP, type RPKPData } from '@/lib/api'
import { formatNumber, formatRupiah, getTypeBadgeColor } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { motion } from 'framer-motion'
import { Sprout, Package, BarChart3, Info } from 'lucide-react'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

const PRODUCT_ICONS: Record<string, string> = {
  UREA: '\u{1F331}',
  NPK: '\u{1F9EA}',
  'SP-36': '\u{1F48E}',
  ZA: '\u{26A1}',
  ORGANIK: '\u{1F343}',
}

function getUtilizationColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500 dark:bg-emerald-400'
  if (percent >= 50) return 'bg-yellow-500 dark:bg-yellow-400'
  return 'bg-red-500 dark:bg-red-400'
}

function getUtilizationTextColor(percent: number): string {
  if (percent >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (percent >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getRemainingColor(product: { remainingKg: number; totalAllocationKg: number }): string {
  const ratio = product.totalAllocationKg > 0 ? product.remainingKg / product.totalAllocationKg : 0
  if (ratio <= 0.1) return 'text-red-600 dark:text-red-400 font-semibold'
  if (ratio <= 0.3) return 'text-amber-600 dark:text-amber-400'
  return 'text-muted-foreground'
}

function generateYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = 2024; y <= currentYear + 1; y++) {
    years.push(y)
  }
  return years
}

export function RPKPView() {
  const refreshKey = useAppStore((s) => s.refreshKey)
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)

  const { data, isLoading, isError, error } = useQuery<RPKPData>({
    queryKey: ['rpkp', selectedYear, refreshKey],
    queryFn: () => fetchRPKP(selectedYear),
  })

  const years = generateYearOptions()

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Perencanaan Kebutuhan Pupuk (RPKP)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Berdasarkan alokasi luas lahan petani terdaftar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tahun:</span>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Summary Cards Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <CardContent className="py-6 text-center text-red-600 dark:text-red-400">
            Gagal memuat data RPKP: {error?.message || 'Terjadi kesalahan'}
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {/* Card 1: Total Lahan Terdaftar */}
            <Card className="card-highlight border-l-4 border-l-emerald-500 dark:border-l-emerald-400">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Lahan Terdaftar
                </CardTitle>
                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 hover:scale-110">
                  <Sprout className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {formatNumber(data.totalLandAreaHa)} ha
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(data.totalFarmers)} petani aktif
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Total Alokasi Tahunan */}
            <Card className="card-highlight border-l-4 border-l-teal-500 dark:border-l-teal-400">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Alokasi Tahunan
                </CardTitle>
                <div className="p-1.5 rounded-md bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 transition-transform duration-200 hover:scale-110">
                  <Package className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {formatNumber(data.summary.totalAllocationKg)} kg
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nilai subsidi: {formatRupiah(data.summary.totalSubsidyValue)}
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Pemanfaatan Keseluruhan */}
            <Card className="card-highlight border-l-4 border-l-amber-500 dark:border-l-amber-400">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pemanfaatan Keseluruhan
                </CardTitle>
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 transition-transform duration-200 hover:scale-110">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold tabular-nums ${getUtilizationTextColor(data.summary.overallUtilizationPercent)}`}>
                  {data.summary.overallUtilizationPercent.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sisa: {formatNumber(data.summary.totalRemainingKg)} kg
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Utilization Progress Bar */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Pemanfaatan Alokasi</span>
                  <span className={`text-sm font-semibold ${getUtilizationTextColor(data.summary.overallUtilizationPercent)}`}>
                    {data.summary.overallUtilizationPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full progress-bar-animated ${getUtilizationColor(data.summary.overallUtilizationPercent)}`}
                    style={{ width: `${Math.min(data.summary.overallUtilizationPercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatNumber(data.summary.totalSoldKg)} kg dari {formatNumber(data.summary.totalAllocationKg)} kg alokasi telah terpakai
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Product Allocation Table */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alokasi Pupuk per Jenis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jenis Pupuk</TableHead>
                        <TableHead className="text-right">Alokasi/ha (kg)</TableHead>
                        <TableHead className="text-right">Total Alokasi (kg)</TableHead>
                        <TableHead className="text-right">Terjual (kg)</TableHead>
                        <TableHead className="text-right">Sisa (kg)</TableHead>
                        <TableHead className="text-right">Pemanfaatan (%)</TableHead>
                        <TableHead className="text-right">Nilai Subsidi (Rp)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.products.map((product) => (
                        <TableRow key={product.productType}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getTypeBadgeColor(product.productType)}
                            >
                              {PRODUCT_ICONS[product.productType] || '\u{1F4E6}'}{' '}
                              {product.productType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(product.allocationPerHa)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(product.totalAllocationKg)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(product.actualSoldKg)}
                          </TableCell>
                          <TableCell className={`text-right ${getRemainingColor(product)}`}>
                            {formatNumber(product.remainingKg)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-sm font-semibold ${getUtilizationTextColor(product.utilizationPercent)}`}>
                                {product.utilizationPercent.toFixed(1)}%
                              </span>
                              <div className="mini-bar-track">
                                <div
                                  className={`mini-bar-fill ${getUtilizationColor(product.utilizationPercent)}`}
                                  style={{ width: `${Math.min(product.utilizationPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatRupiah(product.totalSubsidyValue)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Footer totals row */}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(data.summary.totalAllocationKg)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(data.summary.totalSoldKg)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(data.summary.totalRemainingKg)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={getUtilizationTextColor(data.summary.overallUtilizationPercent)}>
                            {data.summary.overallUtilizationPercent.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatRupiah(data.summary.totalSubsidyValue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Box */}
          <motion.div variants={itemVariants}>
            <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 p-4 flex gap-3">
              <Info className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
              <div className="text-sm text-teal-800 dark:text-teal-300 leading-relaxed">
                <span className="font-semibold">Data RPKP</span> dihitung berdasarkan luas lahan petani aktif &times; alokasi per hektar sesuai Permentan.{' '}
                <span className="font-medium">Alokasi/ha:</span> UREA 250kg, NPK 300kg, SP-36 250kg, ZA 150kg, ORGANIK 500kg
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </motion.div>
  )
}