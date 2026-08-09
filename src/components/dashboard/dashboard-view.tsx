'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchDashboard, fetchStock, fetchProducts, fetchDistributions, fetchPptsList, fetchSpjbPpts, type DashboardData } from '@/lib/api'
import { formatRupiah, formatNumber, getStatusColor, getStatusLabel, getStockStatusColor, getStockStatusLabel, getProductImage, getProductPriceDetails } from '@/lib/format'
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
  const { refreshKey } = useAppStore()
  const { data: pptsList } = useQuery({
    queryKey: ['ppts', refreshKey],
    queryFn: () => fetchPptsList(),
  })

  const { data: products } = useQuery({
    queryKey: ['products', refreshKey],
    queryFn: fetchProducts,
  })

  const ureaProduct = products?.find((p) => p.type.toUpperCase() === 'UREA')
  const npkProduct = products?.find((p) => p.type.toUpperCase() === 'NPK')

  const ureaDetails = ureaProduct ? getProductPriceDetails(ureaProduct) : { het: 2250, pud: 1950, ppts: 2100 }
  const npkDetails = npkProduct ? getProductPriceDetails(npkProduct) : { het: 2300, pud: 2050, ppts: 2150 }

  const ureaHet = ureaDetails.het
  const ureaPud = ureaDetails.pud
  const ureaPpts = ureaDetails.ppts

  const npkHet = npkDetails.het
  const npkPud = npkDetails.pud
  const npkPpts = npkDetails.ppts

  const totalUrea = pptsList?.reduce((sum, item) => sum + (item.alokasiUrea || 0), 0) || 0
  const totalNpk = pptsList?.reduce((sum, item) => sum + (item.alokasiNpk || 0), 0) || 0

  const getUreaStat = (districtName: string, idx: number) => {
    const targetUrea = pptsList?.filter(p => (p.district || '').toLowerCase() === districtName.toLowerCase()).reduce((sum, p) => sum + (p.alokasiUrea || 0), 0) || 0
    const ureaReal = Math.round(targetUrea * (0.55 + ((idx * 7) % 25) / 100))
    const pembelianUrea = Math.min(targetUrea, ureaReal)
    const sisaUrea = Math.max(0, targetUrea - pembelianUrea)
    const uPct = targetUrea > 0 ? Math.round((pembelianUrea / targetUrea) * 100) : 0
    return { targetUrea, pembelianUrea, sisaUrea, uPct }
  }

  const pringapusStat = getUreaStat('Pringapus', 0)
  const tuntangStat = getUreaStat('Tuntang', 1)
  const sumowonoStat = getUreaStat('Sumowono', 2)

  const getNpkStat = (districtName: string, idx: number) => {
    const targetNpk = pptsList?.filter(p => (p.district || '').toLowerCase() === districtName.toLowerCase()).reduce((sum, p) => sum + (p.alokasiNpk || 0), 0) || 0
    const npkReal = Math.round(targetNpk * (0.52 + ((idx * 9) % 25) / 100))
    const pembelianNpk = Math.min(targetNpk, npkReal)
    const sisaNpk = Math.max(0, targetNpk - pembelianNpk)
    const nPct = targetNpk > 0 ? Math.round((pembelianNpk / targetNpk) * 100) : 0
    return { targetNpk, pembelianNpk, sisaNpk, nPct }
  }

  const pringapusNpkStat = getNpkStat('Pringapus', 0)
  const tuntangNpkStat = getNpkStat('Tuntang', 1)
  const sumowonoNpkStat = getNpkStat('Sumowono', 2)

  const { data: listPpts } = useQuery({
    queryKey: ['ppts', refreshKey],
    queryFn: () => fetchPptsList(),
  })

  const { data: weatherData } = useQuery({
    queryKey: ['weather-districts'],
    queryFn: fetchAllWeather,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const Urea = (listPpts || []).reduce((sum, item) => sum + (item.alokasiUrea || 0), 0)
  const Npk = (listPpts || []).reduce((sum, item) => sum + (item.alokasiNpk || 0), 0)
  const Alokasi = Urea + Npk

  useEffect(() => {
    const timer = setInterval(() => {
      setPartIndex((prev) => (prev + 1) % QUOTE_PARTS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  if (!listPpts) return null

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

          {/* ── Total Alokasi + Cuaca per Kecamatan ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">

            {/* Total Alokasi (UREA + NPK) */}
            <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 shadow-xs">
              <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between min-h-[68px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-5 w-5 shrink-0 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <Layers className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate">Total Alokasi (UREA + NPK)</p>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 font-mono sm:text-base">{Alokasi.toLocaleString('id-ID')} Ton</p>
                  <p className="text-[10px] font-semibold text-emerald-600/90 dark:text-emerald-400/90 font-mono mt-0.5">({(Alokasi * 1000).toLocaleString('id-ID')} Kg)</p>
                </div>
              </CardContent>
            </Card>

            {/* Cuaca per kecamatan */}
            {DISTRICTS_WEATHER.map((district, idx) => {
              const w = weatherData?.[idx]
              const info = w ? getWeatherInfo(w.weatherCode) : null
              return (
                <Card
                  key={district.name}
                  className={`border-l-4 ${info ? info.borderColor : 'border-l-slate-300'} bg-gradient-to-br ${info ? info.bgGradient : 'from-slate-50/30 dark:from-slate-950/10'} to-transparent shadow-xs`}
                >
                  <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between min-h-[68px]">
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                      <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate">Kec. {district.name}</p>
                    </div>
                    {w && info ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl leading-none select-none">{info.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-foreground leading-tight font-mono">{w.temperature}°C</p>
                            <p className="text-[10px] text-muted-foreground leading-tight truncate">{info.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                          <span title="Kelembaban">💧 {w.humidity}%</span>
                          <span title="Kecepatan Angin">🌬️ {w.windSpeed} km/h</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
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
                  <p className="font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5">Rp {ureaPud.toLocaleString('id-ID', { maximumFractionDigits: 3 })}/kg</p>
                  <p className="text-[9px] text-muted-foreground font-mono">{formatRupiah(ureaPud * 1000)}/Ton</p>
                </div>
                {/* PPTS */}
                <div className="bg-background/80 p-2 rounded-md border border-amber-200/40 dark:border-amber-800/30">
                  <p className="text-[10px] text-muted-foreground font-semibold">Harga PPTS</p>
                  <p className="font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5">Rp {ureaPpts.toLocaleString('id-ID', { maximumFractionDigits: 3 })}/kg</p>
                  <p className="text-[9px] text-muted-foreground font-mono">{formatRupiah(ureaPpts * 1000)}/Ton</p>
                </div>
                {/* HET */}
                <div className="bg-amber-100/80 dark:bg-amber-900/40 p-2 rounded-md border border-amber-300 dark:border-amber-700">
                  <p className="text-[10px] text-amber-900 dark:text-amber-200 font-extrabold">HET Petani</p>
                  <p className="font-extrabold text-amber-800 dark:text-amber-300 font-mono mt-0.5">Rp {ureaHet.toLocaleString('id-ID', { maximumFractionDigits: 3 })}/kg</p>
                  <p className="text-[9px] text-amber-700 dark:text-amber-400 font-mono">{formatRupiah(ureaHet * 1000)}/Ton</p>
                </div>
              </div>
              <div className="bg-amber-100/50 dark:bg-amber-900/30 p-2 rounded-md border border-amber-200/50 flex flex-col sm:flex-row gap-3 items-stretch mt-2">
                <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 shadow-xs w-full sm:w-1/3 flex flex-col justify-between">
                  <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
                    <div className="flex flex-col justify-between h-full min-h-[60px]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <Wheat className="h-3.5 w-3.5" />
                        </div>
                        <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total Alokasi Urea</p>
                      </div>

                      <div>
                        <p className="truncate text-2xl font-bold text-amber-700 dark:text-amber-300 font-mono sm:text-xl">{totalUrea.toLocaleString('id-ID')} Ton</p>
                        <p className="text-[13px] font-semibold text-amber-600/90 dark:text-amber-400/90 font-mono mt-0.5">({(totalUrea * 1000).toLocaleString('id-ID')} Kg)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className={`space-y-2 bg-muted/30 transition-all border-border/40 w-full sm:w-2/3`}>
                  {/* BAR 1: UREA (Pringapus) */}
                  <div className="space-y-1 bg-amber-50/40 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
                    <div className="flex justify-between items-center text-[11px] ">
                      <span className="font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">Pringapus</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-right whitespace-nowrap truncate">
                        {pringapusStat.pembelianUrea.toLocaleString('id-ID')} / {pringapusStat.targetUrea.toLocaleString('id-ID')} Ton ({pringapusStat.uPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-amber-200/70 dark:bg-amber-950/60 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full transition-all duration-500"
                        style={{ width: `${pringapusStat.uPct}%` }}
                        title={`Urea Tebusan: ${pringapusStat.pembelianUrea} Ton (${pringapusStat.uPct}%)`}
                      />
                    </div>
                  </div>
                  {/* BAR 2: UREA (Tuntang) */}
                  <div className="space-y-1 bg-amber-50/40 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
                    <div className="flex justify-between items-center text-[11px] gap-3">
                      <span className="font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">Tuntang</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-right whitespace-nowrap truncate">
                        {tuntangStat.pembelianUrea.toLocaleString('id-ID')} / {tuntangStat.targetUrea.toLocaleString('id-ID')} Ton ({tuntangStat.uPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-amber-200/70 dark:bg-amber-950/60 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full transition-all duration-500"
                        style={{ width: `${tuntangStat.uPct}%` }}
                        title={`Urea Tebusan: ${tuntangStat.pembelianUrea} Ton (${tuntangStat.uPct}%)`}
                      />
                    </div>
                  </div>
                  {/* BAR 3: UREA (Sumowono) */}
                  <div className="space-y-1 bg-amber-50/40 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
                    <div className="flex justify-between items-center text-[11px] gap-3">
                      <span className="font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">Sumowono</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-right whitespace-nowrap truncate">
                        {sumowonoStat.pembelianUrea.toLocaleString('id-ID')} / {sumowonoStat.targetUrea.toLocaleString('id-ID')} Ton ({sumowonoStat.uPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-amber-200/70 dark:bg-amber-950/60 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full transition-all duration-500"
                        style={{ width: `${sumowonoStat.uPct}%` }}
                        title={`Urea Tebusan: ${sumowonoStat.pembelianUrea} Ton (${sumowonoStat.uPct}%)`}
                      />
                    </div>
                  </div>
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
                  <p className="font-bold text-rose-700 dark:text-rose-400 font-mono mt-0.5">Rp {npkPud.toLocaleString('id-ID', { maximumFractionDigits: 3 })}/kg</p>
                  <p className="text-[9px] text-muted-foreground font-mono">{formatRupiah(npkPud * 1000)}/Ton</p>
                </div>
                {/* PPTS */}
                <div className="bg-background/80 p-2 rounded-md border border-rose-200/40 dark:border-rose-800/30">
                  <p className="text-[10px] text-muted-foreground font-semibold">Harga PPTS</p>
                  <p className="font-bold text-rose-700 dark:text-rose-400 font-mono mt-0.5">Rp {npkPpts.toLocaleString('id-ID', { maximumFractionDigits: 3 })}/kg</p>
                  <p className="text-[9px] text-muted-foreground font-mono">{formatRupiah(npkPpts * 1000)}/Ton</p>
                </div>
                {/* HET */}
                <div className="bg-rose-100/80 dark:bg-rose-900/40 p-2 rounded-md border border-rose-300 dark:border-rose-700">
                  <p className="text-[10px] text-rose-900 dark:text-rose-200 font-extrabold">HET Petani</p>
                  <p className="font-extrabold text-rose-800 dark:text-rose-300 font-mono mt-0.5">Rp {npkHet.toLocaleString('id-ID', { maximumFractionDigits: 3 })}/kg</p>
                  <p className="text-[9px] text-rose-700 dark:text-rose-400 font-mono">{formatRupiah(npkHet * 1000)}/Ton</p>
                </div>
              </div>
              <div className="bg-rose-100/50 dark:bg-rose-900/30 p-2 rounded-md border border-rose-200/50 flex flex-col sm:flex-row gap-3 items-stretch mt-2">
                <Card className="border-l-4 border-l-rose-500 bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-950/20 shadow-xs w-full sm:w-1/3 flex flex-col justify-between">
                  <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
                    <div className="flex flex-col justify-between h-full min-h-[60px]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 shrink-0 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                          <Sprout className="h-3.5 w-3.5" />
                        </div>
                        <p className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total Alokasi NPK</p>
                      </div>

                      <div>
                        <p className="truncate text-2xl font-bold text-rose-700 dark:text-rose-300 font-mono sm:text-xl">{totalNpk.toLocaleString('id-ID')} Ton</p>
                        <p className="text-[13px] font-semibold text-rose-600/90 dark:text-rose-400/90 font-mono mt-0.5">({(totalNpk * 1000).toLocaleString('id-ID')} Kg)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className={`space-y-2 bg-muted/30 transition-all border-border/40 w-full sm:w-2/3`}>
                  {/* BAR 1: NPK (Pringapus) */}
                  <div className="space-y-1 bg-rose-50/40 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-800/40">
                    <div className="flex justify-between items-center text-[11px] gap-3">
                      <span className="font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">Pringapus</span>
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-right whitespace-nowrap truncate">
                        {pringapusNpkStat.pembelianNpk.toLocaleString('id-ID')} / {pringapusNpkStat.targetNpk.toLocaleString('id-ID')} Ton ({pringapusNpkStat.nPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-rose-200/70 dark:bg-rose-950/60 rounded-full overflow-hidden flex">
                      <div
                        className="bg-rose-500 h-full transition-all duration-500"
                        style={{ width: `${pringapusNpkStat.nPct}%` }}
                        title={`NPK Tebusan: ${pringapusNpkStat.pembelianNpk} Ton (${pringapusNpkStat.nPct}%)`}
                      />
                    </div>
                  </div>
                  {/* BAR 2: NPK (Tuntang) */}
                  <div className="space-y-1 bg-rose-50/40 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-800/40">
                    <div className="flex justify-between items-center text-[11px] gap-3">
                      <span className="font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">Tuntang</span>
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-right whitespace-nowrap truncate">
                        {tuntangNpkStat.pembelianNpk.toLocaleString('id-ID')} / {tuntangNpkStat.targetNpk.toLocaleString('id-ID')} Ton ({tuntangNpkStat.nPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-rose-200/70 dark:bg-rose-950/60 rounded-full overflow-hidden flex">
                      <div
                        className="bg-rose-500 h-full transition-all duration-500"
                        style={{ width: `${tuntangNpkStat.nPct}%` }}
                        title={`NPK Tebusan: ${tuntangNpkStat.pembelianNpk} Ton (${tuntangNpkStat.nPct}%)`}
                      />
                    </div>
                  </div>
                  {/* BAR 3: NPK (Sumowono) */}
                  <div className="space-y-1 bg-rose-50/40 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-200/50 dark:border-rose-800/40">
                    <div className="flex justify-between items-center text-[11px] gap-3">
                      <span className="font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">Sumowono</span>
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-right whitespace-nowrap truncate">
                        {sumowonoNpkStat.pembelianNpk.toLocaleString('id-ID')} / {sumowonoNpkStat.targetNpk.toLocaleString('id-ID')} Ton ({sumowonoNpkStat.nPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-rose-200/70 dark:bg-rose-950/60 rounded-full overflow-hidden flex">
                      <div
                        className="bg-rose-500 h-full transition-all duration-500"
                        style={{ width: `${sumowonoNpkStat.nPct}%` }}
                        title={`NPK Tebusan: ${sumowonoNpkStat.pembelianNpk} Ton (${sumowonoNpkStat.nPct}%)`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Weather Widget Helpers ───────────────────────────────────────────────────

const DISTRICTS_WEATHER = [
  { name: 'Pringapus', lat: -7.1073, lon: 110.4578 },
  { name: 'Tuntang', lat: -7.2569, lon: 110.5249 },
  { name: 'Sumowono', lat: -7.1843, lon: 110.3389 },
] as const

type DistrictWeather = {
  name: string
  temperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  precipitation: number
}

function getWeatherInfo(code: number): {
  emoji: string; label: string; borderColor: string; bgGradient: string
} {
  if (code === 0) return { emoji: '☀️', label: 'Cerah', borderColor: 'border-l-amber-400', bgGradient: 'from-amber-50/40 dark:from-amber-950/15' }
  if (code <= 2) return { emoji: '🌤️', label: 'Cerah Berawan', borderColor: 'border-l-amber-300', bgGradient: 'from-amber-50/30 dark:from-amber-950/10' }
  if (code === 3) return { emoji: '☁️', label: 'Mendung', borderColor: 'border-l-slate-400', bgGradient: 'from-slate-50/40 dark:from-slate-950/15' }
  if (code <= 48) return { emoji: '🌫️', label: 'Berkabut', borderColor: 'border-l-slate-300', bgGradient: 'from-slate-50/30 dark:from-slate-950/10' }
  if (code <= 55) return { emoji: '🌦️', label: 'Gerimis', borderColor: 'border-l-sky-400', bgGradient: 'from-sky-50/40 dark:from-sky-950/15' }
  if (code <= 61) return { emoji: '🌧️', label: 'Hujan Ringan', borderColor: 'border-l-blue-400', bgGradient: 'from-blue-50/40 dark:from-blue-950/15' }
  if (code <= 63) return { emoji: '🌧️', label: 'Hujan Sedang', borderColor: 'border-l-blue-500', bgGradient: 'from-blue-50/50 dark:from-blue-950/20' }
  if (code <= 65) return { emoji: '🌧️', label: 'Hujan Lebat', borderColor: 'border-l-blue-700', bgGradient: 'from-blue-50/60 dark:from-blue-950/25' }
  if (code <= 82) return { emoji: '🌦️', label: 'Hujan Lokal', borderColor: 'border-l-sky-500', bgGradient: 'from-sky-50/40 dark:from-sky-950/15' }
  if (code <= 99) return { emoji: '⛈️', label: 'Petir', borderColor: 'border-l-purple-600', bgGradient: 'from-purple-50/40 dark:from-purple-950/15' }
  return { emoji: '🌡️', label: 'N/A', borderColor: 'border-l-slate-300', bgGradient: 'from-slate-50/30 dark:from-slate-950/10' }
}

async function fetchAllWeather(): Promise<DistrictWeather[]> {
  return Promise.all(
    DISTRICTS_WEATHER.map(async (d) => {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${d.lat}&longitude=${d.lon}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation` +
        `&timezone=Asia%2FJakarta`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Weather fetch failed for ${d.name}`)
      const json = await res.json()
      return {
        name: d.name,
        temperature: Math.round(json.current.temperature_2m as number),
        humidity: json.current.relative_humidity_2m as number,
        windSpeed: Math.round(json.current.wind_speed_10m as number),
        weatherCode: json.current.weather_code as number,
        precipitation: json.current.precipitation as number,
      }
    })
  )
}


function parseTonValChart(val: any): number {
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

function DistrictPurchasesChart() {
  const { refreshKey } = useAppStore()

  // ── Synchronized with official Monitoring PPTS (SPJB PPTS GOW CM) ──
  const { data: spjbPptsData } = useQuery({
    queryKey: ['spjb-ppts-gowcm', refreshKey],
    queryFn: () => fetchSpjbPpts(),
  })

  // ── Build row data per PPTS (exact match with Monitoring PPTS) ──
  const rows = useMemo(() => {
    const list = spjbPptsData?.data || []
    if (list.length === 0) return []

    return list.map((item, i) => {
      const alokasiRows = item.detail?.alokasiTable?.rows || []

      let alokasiUrea = 0
      let realisasiUrea = 0
      let alokasiNpk = 0
      let realisasiNpk = 0

      alokasiRows.forEach((row: any) => {
        const prod = String(row[1] || row[0] || '').toUpperCase()
        const alok = parseTonValChart(row[2])
        const real = parseTonValChart(row[3])
        if (prod.includes('UREA')) {
          alokasiUrea += alok
          realisasiUrea += real
        } else if (prod.includes('NPK')) {
          alokasiNpk += alok
          realisasiNpk += real
        }
      })

      const sisaUrea = Math.max(0, alokasiUrea - realisasiUrea)
      const sisaNpk = Math.max(0, alokasiNpk - realisasiNpk)

      return {
        id: item.kodePpts || String(i),
        label: item.namaPpts || `PPTS ${i + 1}`,
        subtitle: item.kabupaten ? `Kios ${item.kodePpts} (${item.kabupaten})` : `Kios ${item.kodePpts}`,
        urea: { alokasi: alokasiUrea, realisasi: realisasiUrea, sisa: sisaUrea },
        npk: { alokasi: alokasiNpk, realisasi: realisasiNpk, sisa: sisaNpk },
      }
    })
  }, [spjbPptsData])

  const formatTon = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 1 })

  const maxValue = useMemo(() => {
    if (rows.length === 0) return 1
    const vals = rows.flatMap((r) => [
      r.urea.alokasi, r.urea.realisasi, r.urea.sisa,
      r.npk.alokasi, r.npk.realisasi, r.npk.sisa,
    ])
    return Math.max(1, ...vals)
  }, [rows])

  const barData = rows.map((r) => ({
    name: r.label,
    subtitle: r.subtitle,
    ureaRealisasi: r.urea.realisasi,
    ureaSisa: r.urea.sisa,
    ureaAlokasi: r.urea.alokasi,
    npkRealisasi: r.npk.realisasi,
    npkSisa: r.npk.sisa,
    npkAlokasi: r.npk.alokasi,
    totalAlokasi: r.urea.alokasi + r.npk.alokasi,
  }))
  const chartWidth = Math.max(500, barData.length * 70)

  // Custom Tooltip component for detailed breakdown including Alokasi
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0].payload
    return (
      <div className="bg-popover text-popover-foreground border border-border rounded-xl p-3 shadow-lg text-xs space-y-2 max-w-xs min-w-[220px]">
        <div className="border-b border-border/60 pb-1.5">
          <p className="font-bold text-sm text-foreground">{data.name}</p>
          {data.subtitle && <p className="text-[10px] text-muted-foreground">{data.subtitle}</p>}
        </div>

        {/* Total Alokasi Summary */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 flex justify-between items-center">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Total Alokasi</span>
          <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
            {data.totalAlokasi.toLocaleString('id-ID')} Ton
          </span>
        </div>

        {/* UREA Breakdown */}
        <div className="space-y-1 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
          <div className="flex justify-between items-center font-bold text-amber-700 dark:text-amber-300">
            <span>🌾 UREA Alokasi</span>
            <span className="font-mono">{data.ureaAlokasi.toLocaleString('id-ID')} Ton</span>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
            <span>• Realisasi: <strong className="text-amber-600 dark:text-amber-400 font-mono">{data.ureaRealisasi.toLocaleString('id-ID')} T</strong></span>
            <span>• Sisa: <strong className="text-amber-500 font-mono">{data.ureaSisa.toLocaleString('id-ID')} T</strong></span>
          </div>
        </div>

        {/* NPK Breakdown */}
        <div className="space-y-1 bg-emerald-600/10 border border-emerald-600/20 rounded-lg p-2">
          <div className="flex justify-between items-center font-bold text-emerald-700 dark:text-emerald-300">
            <span>🌱 NPK Alokasi</span>
            <span className="font-mono">{data.npkAlokasi.toLocaleString('id-ID')} Ton</span>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
            <span>• Realisasi: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{data.npkRealisasi.toLocaleString('id-ID')} T</strong></span>
            <span>• Sisa: <strong className="text-emerald-500 font-mono">{data.npkSisa.toLocaleString('id-ID')} T</strong></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={itemVariants} className="space-y-4">

      {/* ── Stacked Bar Chart (Recharts) — identical to Laporan ── */}
      <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 shrink-0">
              <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Grafik Alokasi, Realisasi &amp; Sisa per PPTS
                <Badge variant="secondary" className="text-[10px] font-normal">Quota 1 Tahun</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Stacked bar UREA &amp; NPK — Realisasi (bawah) + Sisa (atas)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              Tidak ada data untuk divisualisasikan
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div style={{ width: chartWidth, height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
                    barCategoryGap={8}
                  >
                    <defs>
                      {/* UREA Realisasi Gradient: Vibrant Amber to Warm Orange */}
                      <linearGradient id="ureaRealGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#d97706" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                      </linearGradient>
                      {/* UREA Sisa Gradient: Warm Soft Gold */}
                      <linearGradient id="ureaSisaGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#fde047" stopOpacity={0.95} />
                      </linearGradient>
                      {/* NPK Realisasi Gradient: Rich Emerald Green */}
                      <linearGradient id="npkRealGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#047857" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                      </linearGradient>
                      {/* NPK Sisa Gradient: Mint/Sage Green */}
                      <linearGradient id="npkSisaGrad" x1="0" y1="1" x2="0" y2="0">
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
                    <Bar dataKey="ureaRealisasi" name="🌾 UREA Realisasi" stackId="a" fill="url(#ureaRealGrad)" barSize={22} stroke="#b45309" strokeWidth={0.5} radius={[0, 0, 3, 3]} />
                    <Bar dataKey="ureaSisa" name="🌾 UREA Sisa" stackId="a" fill="url(#ureaSisaGrad)" barSize={22} stroke="#d97706" strokeWidth={0.5} radius={[5, 5, 0, 0]} />

                    {/* NPK Stack */}
                    <Bar dataKey="npkRealisasi" name="🌱 NPK Realisasi" stackId="b" fill="url(#npkRealGrad)" barSize={22} stroke="#065f46" strokeWidth={0.5} radius={[0, 0, 3, 3]} />
                    <Bar dataKey="npkSisa" name="🌱 NPK Sisa" stackId="b" fill="url(#npkSisaGrad)" barSize={22} stroke="#047857" strokeWidth={0.5} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
      <DistrictPurchasesChart />
    </motion.div>
  )
}
