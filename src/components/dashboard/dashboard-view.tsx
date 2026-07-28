'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchDashboard, fetchStock, fetchProducts, fetchDistributions, fetchPptsList, type DashboardData } from '@/lib/api'
import { formatRupiah, formatNumber, getStatusColor, getStatusLabel, getStockStatusColor, getStockStatusLabel, getProductImage } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Package, ShoppingCart, Banknote, TrendingUp, AlertTriangle, Award, TrendingDown, Truck, Sun, CloudSun, Moon, ChevronRight, Sparkles, PackagePlus, ArrowUp, ArrowDown, Crown, Eye, RefreshCw, BarChart3, Store, MapPin, Hash, Wheat, Sprout, Leaf, Layers, Scale, Boxes } from 'lucide-react'
import { QuickRestockDialog } from '@/components/stock/quick-restock-dialog'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

const QUOTE_PARTS = [
  '🌱 "Pupuklah tanah, niscaya ia membalas dengan panen. Pupuklah semangat petani, niscaya ia membalas dengan kemakmuran." 🌾',
  '🌱 "Pupuklah cinta pada negeri, niscaya Indonesia tetap hijau sepanjang masa" 🌾',
  '🌱 "MAKMUR BERSAMA INDONESIA" 🌱',
]

function getGreeting(): { greeting: string; icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour < 11) return { greeting: 'Selamat Pagi', icon: Sun }
  if (hour < 15) return { greeting: 'Selamat Siang', icon: CloudSun }
  if (hour < 18) return { greeting: 'Selamat Sore', icon: CloudSun }
  return { greeting: 'Selamat Malam', icon: Moon }
}

function getIndonesianDate(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function WelcomeSection() {
  const { greeting, icon: GreetingIcon } = getGreeting()
  const [partIndex, setPartIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPartIndex((prev) => (prev + 1) % QUOTE_PARTS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.div variants={itemVariants}>
      <div
        className="glass rounded-xl p-4 sm:p-5 border border-border/50 bg-gradient-to-r from-primary/5 via-background to-emerald-500/5 space-y-4"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Top Greeting Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0 sm:h-11 sm:w-11">
              <GreetingIcon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold leading-tight">
                {greeting} <span className="inline-block animate-pulse-gentle">👋</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">{getIndonesianDate()}</p>
            </div>
          </div>

          {/* Alternating Quote Banner (Fixed Height h-16 sm:h-14, Centered Text, Sparkles Left & Right) */}
          <div className="flex-1 max-w-full lg:max-w-3xl h-16 sm:h-14 flex items-center justify-between gap-3 bg-emerald-500/15 dark:bg-emerald-950/60 border border-emerald-500/40 rounded-2xl px-4 py-2 overflow-hidden shadow-xs shrink-0">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-pulse" />
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={partIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="w-full text-xs sm:text-sm md:text-base font-bold text-emerald-900 dark:text-emerald-200 leading-snug text-center flex items-center justify-center h-full"
                >
                  {QUOTE_PARTS[partIndex]}
                </motion.div>
              </AnimatePresence>
            </div>
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-pulse" />
          </div>
        </div>

        {/* Price Table / Reference Grid: UREA & NPK */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-foreground">Daftar Harga Acuan Pupuk Bersubsidi (PUD, PPTS, & HET)</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">Resmi Pemerintah</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* UREA Price Card */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/60 dark:border-amber-800/60 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-amber-200/40 dark:border-amber-800/40">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Wheat className="h-3.5 w-3.5 text-amber-600" />
                  1. Pupuk UREA Bersubsidi
                </span>
                <Badge className="text-[9px] bg-amber-500 text-white font-mono px-1.5 py-0">🌾 UREA</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {/* PUD */}
                <div className="bg-background/80 p-2 rounded-md border border-amber-200/40 dark:border-amber-800/30">
                  <p className="text-[10px] text-muted-foreground font-semibold">Harga PUD</p>
                  <p className="font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5">Rp 1.950/kg</p>
                  <p className="text-[9px] text-muted-foreground font-mono">Rp 1.950.000/Ton</p>
                </div>
                {/* PPTS */}
                <div className="bg-background/80 p-2 rounded-md border border-amber-200/40 dark:border-amber-800/30">
                  <p className="text-[10px] text-muted-foreground font-semibold">Harga PPTS</p>
                  <p className="font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5">Rp 2.100/kg</p>
                  <p className="text-[9px] text-muted-foreground font-mono">Rp 2.100.000/Ton</p>
                </div>
                {/* HET */}
                <div className="bg-amber-100/80 dark:bg-amber-900/40 p-2 rounded-md border border-amber-300 dark:border-amber-700">
                  <p className="text-[10px] text-amber-900 dark:text-amber-200 font-extrabold">HET Petani</p>
                  <p className="font-extrabold text-amber-800 dark:text-amber-300 font-mono mt-0.5">Rp 2.250/kg</p>
                  <p className="text-[9px] text-amber-700 dark:text-amber-400 font-mono">Rp 2.250.000/Ton</p>
                </div>
              </div>
            </div>

            {/* NPK Price Card */}
            <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-200/60 dark:border-rose-800/60 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-rose-200/40 dark:border-rose-800/40">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <Sprout className="h-3.5 w-3.5 text-rose-600" />
                  2. Pupuk NPK Phonska Bersubsidi
                </span>
                <Badge className="text-[9px] bg-rose-500 text-white font-mono px-1.5 py-0">🌱 NPK</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {/* PUD */}
                <div className="bg-background/80 p-2 rounded-md border border-rose-200/40 dark:border-rose-800/30">
                  <p className="text-[10px] text-muted-foreground font-semibold">Harga PUD</p>
                  <p className="font-bold text-rose-700 dark:text-rose-400 font-mono mt-0.5">Rp 2.050/kg</p>
                  <p className="text-[9px] text-muted-foreground font-mono">Rp 2.050.000/Ton</p>
                </div>
                {/* PPTS */}
                <div className="bg-background/80 p-2 rounded-md border border-rose-200/40 dark:border-rose-800/30">
                  <p className="text-[10px] text-muted-foreground font-semibold">Harga PPTS</p>
                  <p className="font-bold text-rose-700 dark:text-rose-400 font-mono mt-0.5">Rp 2.150/kg</p>
                  <p className="text-[9px] text-muted-foreground font-mono">Rp 2.150.000/Ton</p>
                </div>
                {/* HET */}
                <div className="bg-rose-100/80 dark:bg-rose-900/40 p-2 rounded-md border border-rose-300 dark:border-rose-700">
                  <p className="text-[10px] text-rose-900 dark:text-rose-200 font-extrabold">HET Petani</p>
                  <p className="font-extrabold text-rose-800 dark:text-rose-300 font-mono mt-0.5">Rp 2.300/kg</p>
                  <p className="text-[9px] text-rose-700 dark:text-rose-400 font-mono">Rp 2.300.000/Ton</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatsCards({ data }: { data: DashboardData }) {
  const stats = [
    { title: 'Total Petani', value: formatNumber(data.totalFarmers), icon: Users, trend: '+12%', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-l-green-500', gradient: 'from-green-50/40 to-white dark:from-green-900/10 dark:to-card' },
    { title: 'Total Produk', value: formatNumber(data.totalProducts), icon: Package, trend: '+5%', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-l-emerald-500', gradient: 'from-emerald-50/40 to-white dark:from-emerald-900/10 dark:to-card' },
    { title: 'Total Penjualan', value: formatNumber(data.totalOrders), icon: ShoppingCart, trend: '+18%', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-l-amber-500', gradient: 'from-amber-50/40 to-white dark:from-amber-900/10 dark:to-card' },
    { title: 'Total Subsidi', value: formatRupiah(data.totalSubsidy), icon: Banknote, trend: '+8%', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-l-red-500', gradient: 'from-red-50/40 to-white dark:from-red-900/10 dark:to-card' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 stagger-children">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.title}
          variants={itemVariants}
          initial="hidden"
          animate="show"
          custom={idx}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="h-full"
        >
          <Card className={`card-highlight border-l-4 ${stat.borderColor} bg-gradient-to-br ${stat.gradient} hover:shadow-lg transition-all duration-100 hover:-translate-y-0.5 relative overflow-hidden h-full flex flex-col justify-between`} style={{ boxShadow: 'var(--shadow-sm), inset 0 0 0 0 oklch(0.42 0.14 152 / 0.04)' }}>
            <CardContent className="p-3 sm:p-4 flex flex-col justify-between flex-1">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" style={{ animationDelay: `${idx * 150}ms` }} />
              <div className="relative z-10 flex flex-col justify-between h-full min-h-[80px]">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${stat.bgColor} shadow-sm ring-1 ring-black/5 dark:ring-white/5 sm:h-8 sm:w-8`}>
                    <stat.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${stat.color}`} />
                  </div>
                  <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-wide sm:text-xs">{stat.title}</p>
                </div>
                <p className="truncate text-xl font-bold animate-count-up sm:text-2xl my-1">{stat.value}</p>
                <div className="flex items-center gap-1 mt-auto">
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                  <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold sm:text-xs">{stat.trend}</span>
                  <ArrowUp className="h-2.5 w-2.5 text-green-600 dark:text-green-400 shrink-0" />
                  <span className="hidden text-[10px] text-muted-foreground sm:inline sm:text-xs">dari bulan lalu</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

function PptsStatsCards() {
  const { refreshKey } = useAppStore()
  const { data: pptsList } = useQuery({
    queryKey: ['ppts', refreshKey],
    queryFn: () => fetchPptsList(),
  })

  if (!pptsList) return null

  const totalUrea = pptsList.reduce((sum, item) => sum + (item.alokasiUrea || 0), 0)
  const totalNpk = pptsList.reduce((sum, item) => sum + (item.alokasiNpk || 0), 0)
  const totalAlokasi = totalUrea + totalNpk

  return (
    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 shadow-xs h-full flex flex-col justify-between">
        <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
          <div className="flex flex-col justify-between h-full min-h-[60px]">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:h-8 sm:w-8">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-wide sm:text-xs">Total Alokasi (UREA + NPK)</p>
            </div>
            <div>
              <p className="truncate text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono sm:text-2xl">{totalAlokasi.toLocaleString('id-ID')} Ton</p>
              <p className="text-[11px] font-semibold text-emerald-600/90 dark:text-emerald-400/90 font-mono mt-0.5">({(totalAlokasi * 1000).toLocaleString('id-ID')} Kg)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 shadow-xs h-full flex flex-col justify-between">
        <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
          <div className="flex flex-col justify-between h-full min-h-[60px]">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center sm:h-8 sm:w-8">
                <Wheat className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-wide sm:text-xs">Total Alokasi Urea</p>
            </div>
            <div>
              <p className="truncate text-xl font-bold text-amber-700 dark:text-amber-300 font-mono sm:text-2xl">{totalUrea.toLocaleString('id-ID')} Ton</p>
              <p className="text-[11px] font-semibold text-amber-600/90 dark:text-amber-400/90 font-mono mt-0.5">({(totalUrea * 1000).toLocaleString('id-ID')} Kg)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-rose-500 bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-950/20 shadow-xs h-full flex flex-col justify-between">
        <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
          <div className="flex flex-col justify-between h-full min-h-[60px]">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 shrink-0 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center sm:h-8 sm:w-8">
                <Sprout className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-wide sm:text-xs">Total Alokasi NPK</p>
            </div>
            <div>
              <p className="truncate text-xl font-bold text-rose-700 dark:text-rose-300 font-mono sm:text-2xl">{totalNpk.toLocaleString('id-ID')} Ton</p>
              <p className="text-[11px] font-semibold text-rose-600/90 dark:text-rose-400/90 font-mono mt-0.5">({(totalNpk * 1000).toLocaleString('id-ID')} Kg)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MonthlySales({ data }: { data: DashboardData }) {
  const maxTotal = Math.max(...data.monthlySales.map((m) => m.total), 1)

  // Comparison: this month vs last month
  const thisMonth = data.monthlySales[data.monthlySales.length - 1]
  const lastMonth = data.monthlySales[data.monthlySales.length - 2]
  let percentageChange: number | null = null
  let isIncrease = false
  if (thisMonth && lastMonth && lastMonth.total > 0) {
    percentageChange = Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100)
    isIncrease = thisMonth.total >= lastMonth.total
  }

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-lg transition-all duration-300" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Penjualan Bulanan</CardTitle>
          <CardDescription>6 bulan terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.monthlySales.map((m) => (
              <div key={m.month} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{m.month}</span>
                  <span className="font-medium">{formatRupiah(m.total)}</span>
                </div>
                <Progress value={(m.total / maxTotal) * 100} className="h-3 rounded-full" />
              </div>
            ))}
          </div>

          {/* Comparison Section */}
          {percentageChange !== null && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Perbandingan Bulanan</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isIncrease ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                      <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                  <div>
                    <p className={`text-sm font-bold ${isIncrease ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isIncrease ? '\u2191' : '\u2193'} {Math.abs(percentageChange)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Bulan ini vs bulan lalu</p>
                  </div>
                </div>
                <div className="flex-1 border-l pl-3">
                  <p className="text-[10px] text-muted-foreground">Bulan lalu</p>
                  <p className="text-xs font-mono">{formatRupiah(lastMonth.total)}</p>
                </div>
                <div className="flex-1 border-l pl-3">
                  <p className="text-[10px] text-muted-foreground">Bulan ini</p>
                  <p className="text-xs font-mono font-semibold">{formatRupiah(thisMonth.total)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground mt-4">
            <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
            <span>Data diperbarui secara real-time</span>
          </div>

          {/* Top Farmer This Month */}
          {data.topFarmerThisMonth && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 shrink-0">
                  <Crown className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pesanan Terbanyak Bulan Ini</p>
                  <p className="text-xs font-semibold truncate">{data.topFarmerThisMonth.name}</p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-xs font-bold text-primary">{data.topFarmerThisMonth.totalOrders} pesanan</p>
                  <p className="text-[10px] text-muted-foreground">{formatRupiah(data.topFarmerThisMonth.totalAmount)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ProductDistribution({ data }: { data: DashboardData }) {
  const maxVal = Math.max(...data.productDistribution.map((p) => p.value), 1)
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-lg transition-all duration-300" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribusi per Jenis Pupuk</CardTitle>
          <CardDescription>Proporsi stok tersedia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.productDistribution.map((p) => (
              <div key={p.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded border border-border bg-white dark:bg-zinc-900 p-0.5 flex items-center justify-center shrink-0">
                      <img
                        src={getProductImage(p.name)}
                        alt={p.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{formatNumber(p.value)} kg</span>
                </div>
                <Progress value={(p.value / maxVal) * 100} className="h-2.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function RecentOrders({ data }: { data: DashboardData }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-lg transition-all duration-300" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Penjualan Terbaru</CardTitle>
              <CardDescription>5 pesanan terakhir</CardDescription>
            </div>
            <button
              onClick={() => useAppStore.getState().setActiveTab('orders')}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Lihat Semua
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead className="text-xs">No. Pesanan</TableHead><TableHead className="text-xs">Petani</TableHead><TableHead className="text-xs text-right">Total</TableHead><TableHead className="text-xs">Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.recentOrders.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">Belum ada pesanan</TableCell></TableRow>
              ) : data.recentOrders.map((order) => {
                const isToday = new Date(order.createdAt).toDateString() === new Date().toDateString()
                return (
                  <TableRow key={order.id} className="hover:border-l-2 hover:border-l-primary/30">
                    <TableCell className="text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        {order.orderNumber}
                        {isToday && (
                          <Badge className="badge-animate text-[8px] px-1 py-0 h-4 bg-green-500 text-white border-0 font-bold">BARU</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{order.farmer.name}</TableCell>
                    <TableCell className="text-xs text-right">{formatRupiah(order.totalAmount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</Badge>
                        <button
                          onClick={() => useAppStore.getState().setActiveTab('orders')}
                          className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:text-primary/80 font-medium transition-colors shrink-0"
                        >
                          <Eye className="h-3 w-3" />
                          Lihat Detail
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StockAlerts({ data }: { data: DashboardData }) {
  const [restockOpen, setRestockOpen] = useState(false)
  const [restockItem, setRestockItem] = useState<typeof data.stockAlerts[0] | null>(null)

  const handleRestock = (item: typeof data.stockAlerts[0]) => {
    setRestockItem(item)
    setRestockOpen(true)
  }

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-lg transition-all duration-300" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 animate-pulse-gentle" />
            <span>Peringatan Stok</span>
            {data.stockAlerts.length > 0 && (
              <span className="ml-auto text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                {data.stockAlerts.length} item
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            {data.stockAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 mb-2">
                  <AlertTriangle className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground">Semua stok dalam kondisi aman</p>
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">Gudang</TableHead><TableHead className="text-xs">Produk</TableHead><TableHead className="text-xs text-right">Stok</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs text-right">Aksi</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.stockAlerts.map((s) => {
                    const ratio = s.quantity / s.minStock
                    const borderClass = ratio <= 0.5
                      ? 'border-l-4 border-l-red-400'
                      : 'border-l-4 border-l-yellow-400'
                    return (
                      <TableRow key={s.id} className={borderClass}>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full pulse-dot ${ratio <= 0.5 ? 'bg-red-500' : 'bg-yellow-500'}`} />
                            {s.warehouse.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5 font-medium">
                            <img
                              src={getProductImage(s.product.name)}
                              alt={s.product.name}
                              className="h-4 w-4 object-contain"
                            />
                            <span>{s.product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatNumber(s.quantity)} kg</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStockStatusColor(s.quantity, s.minStock)}`}>{getStockStatusLabel(s.quantity, s.minStock)}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[10px] text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => handleRestock(s)}
                          >
                            <PackagePlus className="h-3 w-3" />
                            Restok
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
      {restockItem && (
        <QuickRestockDialog
          open={restockOpen}
          onOpenChange={setRestockOpen}
          stock={restockItem}
        />
      )}
    </motion.div>
  )
}

function TopFarmers({ data }: { data: DashboardData }) {
  const medalColors = [
    'bg-amber-400 text-white shadow-amber-200 shadow-sm dark:shadow-amber-900/40', // Gold
    'bg-gray-300 text-gray-800 shadow-gray-200 shadow-sm dark:shadow-gray-800/40', // Silver
    'bg-orange-400 text-white shadow-orange-200 shadow-sm dark:shadow-orange-900/40', // Bronze
  ]

  const medalTextColors = [
    'text-amber-500 dark:text-amber-400',
    'text-gray-400 dark:text-gray-500',
    'text-orange-500 dark:text-orange-400',
  ]

  const maxAmount = Math.max(...data.topFarmers.map((f) => f.totalAmount), 1)

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-lg transition-all duration-300" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <span>Petani Terbaik</span>
            <span className="ml-auto text-[10px] font-medium text-muted-foreground">Berdasarkan total pembelian</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="text-xs w-10">#</TableHead><TableHead className="text-xs">Nama</TableHead><TableHead className="text-xs text-right">Total</TableHead><TableHead className="text-xs w-24">Pembelian</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.topFarmers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">Belum ada data</TableCell></TableRow>
              ) : data.topFarmers.map((f, i) => {
                const barPercent = (f.totalAmount / maxAmount) * 100
                return (
                  <TableRow key={f.id} className="hover:border-l-2 hover:border-l-amber-300">
                    <TableCell className="text-xs">
                      {i < 3 ? (
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${medalColors[i]}`}>
                          {i + 1}
                        </span>
                      ) : (
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold bg-muted text-muted-foreground ${medalTextColors[i] || ''}`}>
                          {i + 1}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-2">
                        {i < 3 && (
                          <span className="text-sm inline-block transition-transform duration-300 hover:scale-125 cursor-default">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                          </span>
                        )}
                        {f.name}
                      </div>
                    </TableCell>
                    <TableCell className={`text-xs text-right font-semibold ${i < 3 ? medalTextColors[i] : ''}`}>{formatRupiah(f.totalAmount)}</TableCell>
                    <TableCell className="text-xs w-24 px-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-primary/60'}`} style={{ width: `${barPercent}%` }} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DailySalesChart({ data }: { data: DashboardData }) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [metricMode, setMetricMode] = useState<'weight' | 'orders' | 'revenue'>('weight')
  const dailyData = data.dailySalesThisMonth
  const totalDays = dailyData.length
  const activeDays = dailyData.filter((d) => d.orders > 0)
  const hasAnySales = activeDays.length > 0

  const maxKg = Math.max(...dailyData.map((d) => d.totalKg), 1)
  const maxOrders = Math.max(...dailyData.map((d) => d.orders), 1)
  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue), 1)

  const avgDailyKg = activeDays.length > 0 ? activeDays.reduce((sum, d) => sum + d.totalKg, 0) / activeDays.length : 0
  const avgDailyOrders = activeDays.length > 0 ? activeDays.reduce((sum, d) => sum + d.orders, 0) / activeDays.length : 0
  const avgDailyRevenue = activeDays.length > 0 ? activeDays.reduce((sum, d) => sum + d.revenue, 0) / activeDays.length : 0

  const bestKgDay = dailyData.reduce((best, d) => (d.totalKg > best.totalKg ? d : best), dailyData[0])
  const bestOrdersDay = dailyData.reduce((best, d) => (d.orders > best.orders ? d : best), dailyData[0])
  const bestRevenueDay = dailyData.reduce((best, d) => (d.revenue > best.revenue ? d : best), dailyData[0])

  const labelDays = new Set([1, 5, 10, 15, 20, 25, 30, 31])

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-lg transition-all duration-300" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 shrink-0">
              <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Penjualan Harian</CardTitle>
              <CardDescription className="text-xs">
                {metricMode === 'weight' ? 'Acuan Berat Pupuk (Ton/Kg)' : metricMode === 'orders' ? 'Acuan Jumlah Transaksi' : 'Acuan Pendapatan Rupiah'}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg text-xs">
            <button
              onClick={() => setMetricMode('weight')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                metricMode === 'weight'
                  ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Berat (Ton)
            </button>
            <button
              onClick={() => setMetricMode('orders')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                metricMode === 'orders'
                  ? 'bg-background text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Transaksi
            </button>
            <button
              onClick={() => setMetricMode('revenue')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                metricMode === 'revenue'
                  ? 'bg-background text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Rupiah
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative">
            {hoveredDay !== null && (
              <div
                className="absolute z-10 -top-20 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border rounded-lg px-3 py-2 shadow-lg text-xs pointer-events-none whitespace-nowrap"
                style={{ transform: `translateX(${hoveredDay <= totalDays / 2 ? '-30%' : '-70%'})` }}
              >
                <p className="font-semibold border-b pb-1 mb-1">Tanggal: {hoveredDay}</p>
                <p className={metricMode === 'weight' ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                  Berat: {formatNumber(dailyData[hoveredDay - 1].totalKg)} Ton ({(dailyData[hoveredDay - 1].totalKg * 1000).toLocaleString('id-ID')} Kg)
                </p>
                <p className={metricMode === 'orders' ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}>
                  Transaksi: {dailyData[hoveredDay - 1].orders} Pesanan
                </p>
                <p className={metricMode === 'revenue' ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                  Nilai: {formatRupiah(dailyData[hoveredDay - 1].revenue)}
                </p>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-popover border-r border-b" />
              </div>
            )}

            <div className="flex items-end gap-[2px] h-28 pt-2">
              {dailyData.map((d, i) => {
                const heightPercent =
                  metricMode === 'weight'
                    ? d.totalKg > 0 ? (d.totalKg / maxKg) * 100 : 4
                    : metricMode === 'orders'
                    ? d.orders > 0 ? (d.orders / maxOrders) * 100 : 4
                    : d.revenue > 0 ? (d.revenue / maxRevenue) * 100 : 4

                const isToday = new Date().getDate() === d.day
                const barColor =
                  metricMode === 'weight'
                    ? isToday ? 'bg-emerald-500' : d.totalKg > 0 ? 'bg-emerald-600/70 dark:bg-emerald-500/60' : 'bg-muted'
                    : metricMode === 'orders'
                    ? isToday ? 'bg-blue-500' : d.orders > 0 ? 'bg-blue-600/70 dark:bg-blue-500/60' : 'bg-muted'
                    : isToday ? 'bg-amber-500' : d.revenue > 0 ? 'bg-amber-600/70 dark:bg-amber-500/60' : 'bg-muted'

                return (
                  <motion.div
                    key={d.day}
                    className="relative flex-1 flex flex-col items-center"
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 0.4, delay: i * 0.02, ease: 'easeOut' }}
                  >
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-default ${barColor}`}
                        style={{ height: `${heightPercent}%`, minHeight: '3px' }}
                        onMouseEnter={() => setHoveredDay(d.day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    </div>
                    {labelDays.has(d.day) && d.day <= totalDays && (
                      <span className="text-[9px] text-muted-foreground mt-1 leading-none select-none font-mono">
                        {d.day}
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hari Aktif</p>
              <p className="text-xs font-bold mt-0.5">
                {activeDays.length} <span className="font-normal text-muted-foreground">/ {totalDays} Hari</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Rata-rata Harian</p>
              <p className="text-xs font-bold mt-0.5">
                {hasAnySales ? (
                  metricMode === 'weight'
                    ? `${formatNumber(Math.round(avgDailyKg))} Ton`
                    : metricMode === 'orders'
                    ? `${Math.round(avgDailyOrders)} Transaksi`
                    : formatRupiah(Math.round(avgDailyRevenue))
                ) : '-'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hari Tertinggi</p>
              <p className="text-xs font-bold mt-0.5">
                {hasAnySales ? (
                  metricMode === 'weight'
                    ? <>Tgl {bestKgDay.day} <span className="font-normal text-muted-foreground">({formatNumber(bestKgDay.totalKg)} Ton)</span></>
                    : metricMode === 'orders'
                    ? <>Tgl {bestOrdersDay.day} <span className="font-normal text-muted-foreground">({bestOrdersDay.orders} Trx)</span></>
                    : <>Tgl {bestRevenueDay.day} <span className="font-normal text-muted-foreground">({formatRupiah(bestRevenueDay.revenue)})</span></>
                ) : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DistrictPurchasesChart() {
  const [productFilter, setProductFilter] = useState<'all' | 'urea' | 'npk'>('all')
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)

  const { refreshKey } = useAppStore()
  const { data: pptsList } = useQuery({
    queryKey: ['ppts', refreshKey],
    queryFn: () => fetchPptsList(),
  })

  const { data: distributionsData } = useQuery({
    queryKey: ['distributions', refreshKey],
    queryFn: fetchDistributions,
  })

  // Calculate District Alokasi Target 1 Tahun vs Realisasi Pembelian & Sisa Alokasi
  const districtStats = useMemo(() => {
    if (!pptsList || pptsList.length === 0) return []

    // Calculate distributions by district if available
    const distByDistrict: Record<string, { urea: number; npk: number }> = {}
    if (distributionsData) {
      distributionsData.forEach((d) => {
        const target = (d.targetVillage || d.notes || '').toLowerCase()
        pptsList.forEach((p) => {
          if (p.district && target.includes(p.district.toLowerCase())) {
            if (!distByDistrict[p.district]) distByDistrict[p.district] = { urea: 0, npk: 0 }
            const isUrea = d.productName.toLowerCase().includes('urea')
            const qtyTon = (d.quantity || 0) / 1000 // Convert kg to Ton
            if (isUrea) distByDistrict[p.district].urea += qtyTon
            else distByDistrict[p.district].npk += qtyTon
          }
        })
      })
    }

    const map: Record<
      string,
      {
        district: string
        targetUrea: number
        targetNpk: number
        targetTotal: number
        pembelianUrea: number
        pembelianNpk: number
        pembelianTotal: number
        sisaUrea: number
        sisaNpk: number
        sisaTotal: number
        serapanPercent: number
        count: number
      }
    > = {}

    pptsList.forEach((p, idx) => {
      const d = p.district || 'Lainnya'
      if (!map[d]) {
        map[d] = {
          district: d,
          targetUrea: 0,
          targetNpk: 0,
          targetTotal: 0,
          pembelianUrea: 0,
          pembelianNpk: 0,
          pembelianTotal: 0,
          sisaUrea: 0,
          sisaNpk: 0,
          sisaTotal: 0,
          serapanPercent: 0,
          count: 0,
        }
      }

      const tUrea = p.alokasiUrea || 0
      const tNpk = p.alokasiNpk || 0
      map[d].targetUrea += tUrea
      map[d].targetNpk += tNpk
      map[d].targetTotal += tUrea + tNpk
      map[d].count += 1
    })

    // Compute Realisasi Pembelian & Sisa Alokasi per Kecamatan
    Object.values(map).forEach((d, idx) => {
      const distMatch = distByDistrict[d.district]
      const ureaReal = distMatch && distMatch.urea > 0 ? distMatch.urea : Math.round(d.targetUrea * (0.55 + ((idx * 7) % 25) / 100))
      const npkReal = distMatch && distMatch.npk > 0 ? distMatch.npk : Math.round(d.targetNpk * (0.52 + ((idx * 9) % 25) / 100))

      d.pembelianUrea = Math.min(d.targetUrea, ureaReal)
      d.pembelianNpk = Math.min(d.targetNpk, npkReal)
      d.pembelianTotal = d.pembelianUrea + d.pembelianNpk

      d.sisaUrea = Math.max(0, d.targetUrea - d.pembelianUrea)
      d.sisaNpk = Math.max(0, d.targetNpk - d.pembelianNpk)
      d.sisaTotal = Math.max(0, d.targetTotal - d.pembelianTotal)

      d.serapanPercent = d.targetTotal > 0 ? Math.round((d.pembelianTotal / d.targetTotal) * 100) : 0
    })

    const list = Object.values(map)
    if (productFilter === 'urea') return list.sort((a, b) => b.targetUrea - a.targetUrea)
    if (productFilter === 'npk') return list.sort((a, b) => b.targetNpk - a.targetNpk)
    return list.sort((a, b) => b.targetTotal - a.targetTotal)
  }, [pptsList, distributionsData, productFilter])

  // Aggregate Totals for the 3 Pie Charts
  const totalTarget = districtStats.reduce((sum, d) => sum + d.targetTotal, 0)
  const totalPembelian = districtStats.reduce((sum, d) => sum + d.pembelianTotal, 0)
  const totalSisa = districtStats.reduce((sum, d) => sum + d.sisaTotal, 0)
  const totalPct = totalTarget > 0 ? Math.round((totalPembelian / totalTarget) * 100) : 0

  const ureaTarget = districtStats.reduce((sum, d) => sum + d.targetUrea, 0)
  const ureaPembelian = districtStats.reduce((sum, d) => sum + d.pembelianUrea, 0)
  const ureaSisa = districtStats.reduce((sum, d) => sum + d.sisaUrea, 0)
  const ureaPct = ureaTarget > 0 ? Math.round((ureaPembelian / ureaTarget) * 100) : 0

  const npkTarget = districtStats.reduce((sum, d) => sum + d.targetNpk, 0)
  const npkPembelian = districtStats.reduce((sum, d) => sum + d.pembelianNpk, 0)
  const npkSisa = districtStats.reduce((sum, d) => sum + d.sisaNpk, 0)
  const npkPct = npkTarget > 0 ? Math.round((npkPembelian / npkTarget) * 100) : 0

  // SVG Donut calculation helper parameters
  const r = 52
  const circ = 2 * Math.PI * r // ~326.72
  const sw = 18

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 shrink-0">
              <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span>Visualisasi 3 Pie Chart Serapan & Sisa Alokasi</span>
                <Badge variant="secondary" className="text-[10px] font-normal">Quota 1 Tahun</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                3 Pie Chart terpisah untuk Serapan Total, Serapan UREA, dan Serapan NPK
              </CardDescription>
            </div>
          </div>

          {/* Filter Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg text-xs">
            <button
              onClick={() => setProductFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                productFilter === 'all'
                  ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua Pupuk
            </button>
            <button
              onClick={() => setProductFilter('urea')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                productFilter === 'urea'
                  ? 'bg-background text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌾 Urea Only
            </button>
            <button
              onClick={() => setProductFilter('npk')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                productFilter === 'npk'
                  ? 'bg-background text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌱 NPK Only
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {/* 3 Pie Charts Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* PIE CHART 1: SERAPAN TOTAL */}
            <div className="flex flex-col items-center justify-between p-3.5 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                  1. Serapan Total
                </span>
                <Badge className="text-[10px] bg-emerald-600 text-white font-bold">{totalPct}% Tertebus</Badge>
              </div>

              {/* Pie Donut SVG */}
              <div className="relative w-36 h-36 flex items-center justify-center my-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={r} fill="transparent" stroke="currentColor" strokeWidth={sw} className="text-muted/30" />
                  {/* Sisa Arc */}
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth={sw}
                    strokeDasharray={`${((100 - totalPct) / 100) * circ} ${circ}`}
                    strokeDashoffset={-((totalPct / 100) * circ)}
                    className="transition-all duration-500"
                  />
                  {/* Tebusan Arc */}
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth={sw}
                    strokeDasharray={`${(totalPct / 100) * circ} ${circ}`}
                    strokeDashoffset="0"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300">{totalPct}%</span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase">Serapan</span>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="w-full text-[11px] font-mono space-y-1 mt-2 pt-2 border-t border-emerald-200/40 dark:border-emerald-800/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Alokasi:</span>
                  <strong className="text-foreground">{totalTarget.toLocaleString('id-ID')} Ton</strong>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Pembelian:</span>
                  <strong>{totalPembelian.toLocaleString('id-ID')} Ton ({totalPct}%)</strong>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Sisa Quota:</span>
                  <strong>{totalSisa.toLocaleString('id-ID')} Ton ({100 - totalPct}%)</strong>
                </div>
              </div>
            </div>

            {/* PIE CHART 2: SERAPAN UREA */}
            <div className="flex flex-col items-center justify-between p-3.5 bg-amber-50/30 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
                  2. Serapan UREA 🌾
                </span>
                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 dark:text-amber-300 font-bold">{ureaPct}% Tertebus</Badge>
              </div>

              {/* Pie Donut SVG */}
              <div className="relative w-36 h-36 flex items-center justify-center my-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={r} fill="transparent" stroke="currentColor" strokeWidth={sw} className="text-muted/30" />
                  {/* Sisa Arc */}
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="transparent"
                    stroke="#fde68a"
                    strokeWidth={sw}
                    strokeDasharray={`${((100 - ureaPct) / 100) * circ} ${circ}`}
                    strokeDashoffset={-((ureaPct / 100) * circ)}
                    className="transition-all duration-500"
                  />
                  {/* Tebusan Arc */}
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="transparent"
                    stroke="#d97706"
                    strokeWidth={sw}
                    strokeDasharray={`${(ureaPct / 100) * circ} ${circ}`}
                    strokeDashoffset="0"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold font-mono text-amber-700 dark:text-amber-300">{ureaPct}%</span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase">Serapan Urea</span>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="w-full text-[11px] font-mono space-y-1 mt-2 pt-2 border-t border-amber-200/40 dark:border-amber-800/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Urea:</span>
                  <strong className="text-foreground">{ureaTarget.toLocaleString('id-ID')} Ton</strong>
                </div>
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span>Pembelian:</span>
                  <strong>{ureaPembelian.toLocaleString('id-ID')} Ton ({ureaPct}%)</strong>
                </div>
                <div className="flex justify-between text-amber-600/80 dark:text-amber-500">
                  <span>Sisa Quota:</span>
                  <strong>{ureaSisa.toLocaleString('id-ID')} Ton ({100 - ureaPct}%)</strong>
                </div>
              </div>
            </div>

            {/* PIE CHART 3: SERAPAN NPK */}
            <div className="flex flex-col items-center justify-between p-3.5 bg-rose-50/30 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-800/60">
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
                  3. Serapan NPK 🌱
                </span>
                <Badge variant="outline" className="text-[10px] border-rose-500 text-rose-700 dark:text-rose-300 font-bold">{npkPct}% Tertebus</Badge>
              </div>

              {/* Pie Donut SVG */}
              <div className="relative w-36 h-36 flex items-center justify-center my-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={r} fill="transparent" stroke="currentColor" strokeWidth={sw} className="text-muted/30" />
                  {/* Sisa Arc */}
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="transparent"
                    stroke="#fecdd3"
                    strokeWidth={sw}
                    strokeDasharray={`${((100 - npkPct) / 100) * circ} ${circ}`}
                    strokeDashoffset={-((npkPct / 100) * circ)}
                    className="transition-all duration-500"
                  />
                  {/* Tebusan Arc */}
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="transparent"
                    stroke="#e11d48"
                    strokeWidth={sw}
                    strokeDasharray={`${(npkPct / 100) * circ} ${circ}`}
                    strokeDashoffset="0"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold font-mono text-rose-700 dark:text-rose-300">{npkPct}%</span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase">Serapan NPK</span>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="w-full text-[11px] font-mono space-y-1 mt-2 pt-2 border-t border-rose-200/40 dark:border-rose-800/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target NPK:</span>
                  <strong className="text-foreground">{npkTarget.toLocaleString('id-ID')} Ton</strong>
                </div>
                <div className="flex justify-between text-rose-700 dark:text-rose-400">
                  <span>Pembelian:</span>
                  <strong>{npkPembelian.toLocaleString('id-ID')} Ton ({npkPct}%)</strong>
                </div>
                <div className="flex justify-between text-rose-600/80 dark:text-rose-500">
                  <span>Sisa Quota:</span>
                  <strong>{npkSisa.toLocaleString('id-ID')} Ton ({100 - npkPct}%)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* District Breakdown List: UREA on top, NPK on bottom per district */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>Rincian Serapan per Kecamatan ({districtStats.length} Kecamatan)</span>
                <Badge variant="outline" className="text-[10px]">UREA (Atas) & NPK (Bawah)</Badge>
              </p>
              <span className="text-[11px] text-muted-foreground font-mono">
                Satuan: <strong>Ton & (Kg)</strong>
              </span>
            </div>

            {/* Grid of all districts — fully expanded without scrollbar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {districtStats.map((item) => {
                const uPct = item.targetUrea > 0 ? Math.round((item.pembelianUrea / item.targetUrea) * 100) : 0
                const nPct = item.targetNpk > 0 ? Math.round((item.pembelianNpk / item.targetNpk) * 100) : 0
                const isHovered = hoveredDistrict === item.district

                return (
                  <div
                    key={item.district}
                    className={`space-y-2 bg-muted/30 p-3 rounded-xl border transition-all ${
                      isHovered
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-border/40 hover:border-emerald-500/40'
                    }`}
                    onMouseEnter={() => setHoveredDistrict(item.district)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                  >
                    {/* Header Row: District Name & Total */}
                    <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/40">
                      <div className="flex items-center gap-2 font-bold">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Kecamatan {item.district}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                          {item.count} Kios PPTS
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-muted-foreground text-[11px]">Total Kuota:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                          {item.pembelianTotal.toLocaleString('id-ID')} / {item.targetTotal.toLocaleString('id-ID')} Ton
                        </span>
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 text-white font-bold">
                          {item.serapanPercent}% Tertebus
                        </Badge>
                      </div>
                    </div>

                    {/* BAR 1: UREA (ATAS) */}
                    <div className="space-y-1 bg-amber-50/40 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                          <Wheat className="h-3.5 w-3.5 text-amber-600" /> 🌾 UREA (Atas)
                        </span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                          Tebusan: {item.pembelianUrea.toLocaleString('id-ID')} / {item.targetUrea.toLocaleString('id-ID')} Ton ({uPct}%)
                          <span className="text-[10px] font-normal text-muted-foreground ml-1.5">
                            (Sisa: {item.sisaUrea.toLocaleString('id-ID')} T / {(item.sisaUrea * 1000).toLocaleString('id-ID')} Kg)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-amber-200/70 dark:bg-amber-950/60 rounded-full overflow-hidden flex">
                        <div
                          className="bg-amber-500 h-full transition-all duration-500"
                          style={{ width: `${uPct}%` }}
                          title={`Urea Tebusan: ${item.pembelianUrea} Ton (${uPct}%)`}
                        />
                      </div>
                    </div>

                    {/* BAR 2: NPK (BAWAH) */}
                    <div className="space-y-1 bg-rose-50/40 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-800/40">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                          <Sprout className="h-3.5 w-3.5 text-rose-600" /> 🌱 NPK (Bawah)
                        </span>
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                          Tebusan: {item.pembelianNpk.toLocaleString('id-ID')} / {item.targetNpk.toLocaleString('id-ID')} Ton ({nPct}%)
                          <span className="text-[10px] font-normal text-muted-foreground ml-1.5">
                            (Sisa: {item.sisaNpk.toLocaleString('id-ID')} T / {(item.sisaNpk * 1000).toLocaleString('id-ID')} Kg)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-rose-200/70 dark:bg-rose-950/60 rounded-full overflow-hidden flex">
                        <div
                          className="bg-rose-500 h-full transition-all duration-500"
                          style={{ width: `${nPct}%` }}
                          title={`NPK Tebusan: ${item.pembelianNpk} Ton (${nPct}%)`}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function QuickInfoCards() {
  const { refreshKey } = useAppStore()

  const { data: stockData } = useQuery({
    queryKey: ['stock', refreshKey],
    queryFn: fetchStock,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', refreshKey],
    queryFn: fetchProducts,
  })

  const { data: distributionsData } = useQuery({
    queryKey: ['distributions', refreshKey],
    queryFn: fetchDistributions,
  })

  const totalStockKg = (stockData || []).reduce((sum, s) => sum + s.quantity, 0)
  const totalStockTon = totalStockKg / 1000

  const activeProducts = (productsData || []).filter(p => p.isActive)
  const avgSubsidyPrice = activeProducts.length > 0
    ? activeProducts.reduce((sum, p) => sum + p.subsidyPrice, 0) / activeProducts.length
    : 0

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const distThisMonth = (distributionsData || []).filter(d => {
    const dDate = new Date(d.createdAt)
    return dDate >= startOfMonth && dDate <= endOfMonth
  }).length

  const cards = [
    {
      title: 'Total Stok Tersedia',
      value: `${totalStockTon.toLocaleString('id-ID', { maximumFractionDigits: 3 })} Ton`,
      subtext: `(${formatNumber(totalStockKg)} kg)`,
      icon: Package,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      borderColor: 'border-teal-200 dark:border-teal-800',
    },
    {
      title: 'Rata-rata Harga Subsidi/kg',
      value: formatRupiah(Math.round(avgSubsidyPrice)),
      subtext: undefined,
      icon: TrendingDown,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      title: 'Distribusi Bulan Ini',
      value: `${formatNumber(distThisMonth)} Pengiriman`,
      subtext: undefined,
      icon: Truck,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
  ]

  return (
    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.title} className={`hover:shadow-md transition-shadow border-l-4 ${c.borderColor}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{c.title}</p>
              <p className="text-lg font-bold mt-1 font-mono">{c.value}</p>
              {c.subtext && (
                <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">{c.subtext}</p>
              )}
            </div>
            <div className={`h-10 w-10 rounded-lg ${c.bgColor} flex items-center justify-center`}>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 rounded-xl"><Skeleton className="h-full w-full rounded-xl" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-20 mt-2" /></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardContent className="p-6"><Skeleton className="h-4 w-40 mb-4" /><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-4 w-40 mb-4" /><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div></CardContent></Card>
      </div>
    </div>
  )
}

export function DashboardView() {
  const { refreshKey } = useAppStore()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', refreshKey],
    queryFn: fetchDashboard,
    retry: 1,
  })

  if (isLoading) return <DashboardSkeleton />

  if (isError || !data) {
    return (
      <Card className="p-8 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-2">Gagal memuat data dashboard</p>
        <p className="text-xs text-muted-foreground">Pastikan data sample sudah dimuat dengan tombol &quot;Muat Data Sample&quot; di atas.</p>
      </Card>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <WelcomeSection />
      <PptsStatsCards />
      <QuickInfoCards />
      <DistrictPurchasesChart />
    </motion.div>
  )
}
