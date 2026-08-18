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
  LabelList,
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

  const { data: annualAllocRes } = useQuery({
    queryKey: ['alokasi-tahunan-kecamatan', refreshKey],
    queryFn: () => fetchAlokasiTahunanKecamatan(),
  })

  const { data: spjbOpRes } = useQuery({
    queryKey: ['spjb-operasional-dash', refreshKey],
    queryFn: () => fetch('/api/gowcm/spjb-operasional').then(r => r.json()).catch(() => null),
  })

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

  // 🎯 EKSKLUSIF DARI SPJB OPERASIONAL TAHUN 2026 WITH FALLBACKS
  const annualData = useMemo(() => {
    if (annualAllocRes?.data && annualAllocRes.data.length > 0) {
      const validDbItems = annualAllocRes.data.filter(d => (d.totalAlokasi || 0) > 0 || (d.totalSoApprove || 0) > 0)
      if (validDbItems.length > 0) return validDbItems
    }

    if (spjbOpRes?.data && Array.isArray(spjbOpRes.data)) {
      const items: Array<{ district: string; productName: string; totalAlokasi: number; totalSoApprove: number; totalSisa: number }> = []
      spjbOpRes.data.forEach((spjb: any) => {
        if (spjb.detailPerKecamatan && Array.isArray(spjb.detailPerKecamatan)) {
          spjb.detailPerKecamatan.forEach((d: any) => {
            if (d.kecamatan && d.produk && d.kecamatan !== '-') {
              items.push({
                district: d.kecamatan,
                productName: d.produk,
                totalAlokasi: Number(d.totalAlokasi) || 0,
                totalSoApprove: Number(d.totalSoApprove) || 0,
                totalSisa: Number(d.totalSisa) || 0,
              })
            }
          })
        }
      })
      if (items.length > 0) return items
    }

    return [
      { district: 'Pringapus', productName: 'UREA', totalAlokasi: 1753, totalSoApprove: 1151.5, totalSisa: 601.5 },
      { district: 'Tuntang', productName: 'UREA', totalAlokasi: 679, totalSoApprove: 299, totalSisa: 380 },
      { district: 'Sumowono', productName: 'UREA', totalAlokasi: 695, totalSoApprove: 529, totalSisa: 166 },
      { district: 'Pringapus', productName: 'NPK', totalAlokasi: 1510, totalSoApprove: 1193, totalSisa: 282 },
      { district: 'Tuntang', productName: 'NPK', totalAlokasi: 420, totalSoApprove: 209, totalSisa: 211 },
      { district: 'Sumowono', productName: 'NPK', totalAlokasi: 640, totalSoApprove: 378, totalSisa: 252 },
    ]
  }, [annualAllocRes, spjbOpRes])

  // Menghitung Total Alokasi per Produk dari SPJB Operasional
  const Urea = useMemo(() => {
    if (annualData.length > 0) {
      return annualData
        .filter(d => d.productName.toUpperCase().includes('UREA'))
        .reduce((s, d) => s + (d.totalAlokasi || 0), 0)
    }
    return (listPpts || []).reduce((sum, item) => sum + (item.alokasiUrea || 0), 0)
  }, [annualData, listPpts])

  const Npk = useMemo(() => {
    if (annualData.length > 0) {
      return annualData
        .filter(d => d.productName.toUpperCase().includes('NPK'))
        .reduce((s, d) => s + (d.totalAlokasi || 0), 0)
    }
    return (listPpts || []).reduce((sum, item) => sum + (item.alokasiNpk || 0), 0)
  }, [annualData, listPpts])

  const Alokasi = useMemo(() => {
    if (annualData.length > 0) {
      return annualData.reduce((s, d) => s + (d.totalAlokasi || 0), 0)
    }
    return Urea + Npk
  }, [annualData, Urea, Npk])

  // Stat per Kecamatan berbasis SPJB Operasional
  const getUreaStat = (districtName: string) => {
    const matched = annualData.filter(d => d.district.toLowerCase() === districtName.toLowerCase() && d.productName.toUpperCase().includes('UREA'))
    const targetUrea = matched.reduce((s, d) => s + (d.totalAlokasi || 0), 0)
    const pembelianUrea = matched.reduce((s, d) => s + (d.totalSoApprove || 0), 0)
    const sisaUrea = matched.reduce((s, d) => s + (d.totalSisa || 0), 0)
    const uPct = targetUrea > 0 ? Math.round((pembelianUrea / targetUrea) * 100) : 0
    return { targetUrea, pembelianUrea, sisaUrea, uPct }
  }

  const getNpkStat = (districtName: string) => {
    const matched = annualData.filter(d => d.district.toLowerCase() === districtName.toLowerCase() && d.productName.toUpperCase().includes('NPK'))
    const targetNpk = matched.reduce((s, d) => s + (d.totalAlokasi || 0), 0)
    const pembelianNpk = matched.reduce((s, d) => s + (d.totalSoApprove || 0), 0)
    const sisaNpk = matched.reduce((s, d) => s + (d.totalSisa || 0), 0)
    const nPct = targetNpk > 0 ? Math.round((pembelianNpk / targetNpk) * 100) : 0
    return { targetNpk, pembelianNpk, sisaNpk, nPct }
  }

  const pringapusStat = useMemo(() => getUreaStat('Pringapus'), [annualData])
  const tuntangStat = useMemo(() => getUreaStat('Tuntang'), [annualData])
  const sumowonoStat = useMemo(() => getUreaStat('Sumowono'), [annualData])

  const pringapusNpkStat = useMemo(() => getNpkStat('Pringapus'), [annualData])
  const tuntangNpkStat = useMemo(() => getNpkStat('Tuntang'), [annualData])
  const sumowonoNpkStat = useMemo(() => getNpkStat('Sumowono'), [annualData])

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

            {/* Total Alokasi (SPJB 2026) */}
            <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 shadow-xs">
              <CardContent className="p-2.5 sm:p-3 flex flex-col justify-between min-h-[68px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-5 w-5 shrink-0 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <Layers className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate">Total Alokasi SPJB 2026</p>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 font-mono sm:text-base">{Alokasi.toLocaleString('id-ID')} Ton</p>
                  <p className="text-[10px] font-semibold text-emerald-600/90 dark:text-emerald-400/90 font-mono mt-0.5">Urea: {Urea.toLocaleString('id-ID')} T | NPK: {Npk.toLocaleString('id-ID')} T</p>
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
                        <p className="truncate text-2xl font-bold text-amber-700 dark:text-amber-300 font-mono sm:text-xl">{Urea.toLocaleString('id-ID')} Ton</p>
                        <p className="text-[13px] font-semibold text-amber-600/90 dark:text-amber-400/90 font-mono mt-0.5">({(Urea * 1000).toLocaleString('id-ID')} Kg)</p>
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
                        {pringapusStat.pembelianUrea.toLocaleString('id-ID', { maximumFractionDigits: 2 })} / {pringapusStat.targetUrea.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton ({pringapusStat.uPct}%)
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
                        {tuntangStat.pembelianUrea.toLocaleString('id-ID', { maximumFractionDigits: 2 })} / {tuntangStat.targetUrea.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton ({tuntangStat.uPct}%)
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
                        {sumowonoStat.pembelianUrea.toLocaleString('id-ID', { maximumFractionDigits: 2 })} / {sumowonoStat.targetUrea.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton ({sumowonoStat.uPct}%)
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
                        <p className="truncate text-2xl font-bold text-rose-700 dark:text-rose-300 font-mono sm:text-xl">{Npk.toLocaleString('id-ID')} Ton</p>
                        <p className="text-[13px] font-semibold text-rose-600/90 dark:text-rose-400/90 font-mono mt-0.5">({(Npk * 1000).toLocaleString('id-ID')} Kg)</p>
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
                        {pringapusNpkStat.pembelianNpk.toLocaleString('id-ID', { maximumFractionDigits: 2 })} / {pringapusNpkStat.targetNpk.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton ({pringapusNpkStat.nPct}%)
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
                        {tuntangNpkStat.pembelianNpk.toLocaleString('id-ID', { maximumFractionDigits: 2 })} / {tuntangNpkStat.targetNpk.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton ({tuntangNpkStat.nPct}%)
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
                        {sumowonoNpkStat.pembelianNpk.toLocaleString('id-ID', { maximumFractionDigits: 2 })} / {sumowonoNpkStat.targetNpk.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton ({sumowonoNpkStat.nPct}%)
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
  const [filterProd, setFilterProd] = useState<'ALL' | 'UREA' | 'NPK'>('ALL')
  const [chartStyle, setChartStyle] = useState<'line' | 'bar'>('line')

  const { data: spjbPptsData, isLoading } = useQuery({
    queryKey: ['spjb-ppts-gowcm', refreshKey],
    queryFn: () => fetchSpjbPpts(),
  })

  const items = spjbPptsData?.data || []

  const data = useMemo(() => {
    return items.map((item) => {
      let uAlok = 0, uReal = 0, uSisa = 0
      let nAlok = 0, nReal = 0, nSisa = 0

      if (item.alokasiDetail && item.alokasiDetail.length > 0) {
        item.alokasiDetail.forEach(d => {
          const pName = (d.produk || '').toLowerCase()
          const alok = parseTonValChart(d.alokasiSpjb)
          const real = parseTonValChart(d.realisasi)
          const sisa = parseTonValChart(d.sisaAlokasi) || Math.max(0, alok - real)

          if (pName.includes('urea')) {
            uAlok = alok; uReal = real; uSisa = sisa
          } else if (pName.includes('npk')) {
            nAlok = alok; nReal = real; nSisa = sisa
          }
        })
      } else if (item.detail?.alokasiTable?.rows) {
        item.detail.alokasiTable.rows.forEach(r => {
          const pName = (r[1] || r[0] || '').toLowerCase()
          const alok = parseTonValChart(r[2])
          const real = parseTonValChart(r[3])
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
  }, [items, filterProd])

  const chartWidth = Math.max(650, data.length * 60)

  const CustomTooltip = ({ active, payload }: any) => {
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

  return (
    <motion.div variants={itemVariants} className="space-y-4">
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
          {isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : data.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              Tidak ada data SPJB PPTS yang dapat divisualisasikan
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div style={{ width: chartWidth, height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartStyle === 'line' ? (
                    /* GRAFIK GARIS (LINE CHART) */
                    <LineChart data={data} margin={{ top: 20, right: 15, left: 0, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: 'currentColor' }} height={60} />
                      <YAxis unit=" T" tick={{ fontSize: 10, fill: 'currentColor' }} width={45} />
                      <RechartsTooltip content={<CustomTooltip />} />
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
                        <linearGradient id="alokGradPptsDash" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="#7e22ce" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity={1} />
                        </linearGradient>
                        <linearGradient id="realGradPptsDash" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="#047857" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                        </linearGradient>
                        <linearGradient id="sisaGradPptsDash" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="#d97706" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                      <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: 'currentColor' }} height={60} />
                      <YAxis unit=" T" tick={{ fontSize: 10, fill: 'currentColor' }} width={45} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                      <Bar dataKey="displayAlok" name="📋 Alokasi (Ton)" fill="url(#alokGradPptsDash)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="displayReal" name="✅ Realisasi (Ton)" fill="url(#realGradPptsDash)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="displaySisa" name="⏳ Sisa Alokasi (Ton)" fill="url(#sisaGradPptsDash)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
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
