'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchDashboard, fetchStock, fetchProducts, fetchDistributions, type DashboardData } from '@/lib/api'
import { formatRupiah, formatNumber, getStatusColor, getStatusLabel, getStockStatusColor, getStockStatusLabel } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { motion } from 'framer-motion'
import { Users, Package, ShoppingCart, Banknote, TrendingUp, AlertTriangle, Award, TrendingDown, Truck, Sun, CloudSun, Moon, ChevronRight, Sparkles } from 'lucide-react'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

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
  return (
    <motion.div variants={itemVariants}>
      <div className="glass rounded-xl p-4 sm:p-5 border border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <GreetingIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold leading-tight">
              {greeting} <span className="inline-block animate-pulse-gentle">👋</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{getIndonesianDate()}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Ringkasan hari ini</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatsCards({ data }: { data: DashboardData }) {
  const stats = [
    { title: 'Total Petani', value: formatNumber(data.totalFarmers), icon: Users, trend: '+12%', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-l-emerald-500', gradient: 'from-emerald-50/40 to-white dark:from-emerald-900/10 dark:to-card' },
    { title: 'Total Produk', value: formatNumber(data.totalProducts), icon: Package, trend: '+5%', color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-900/20', borderColor: 'border-l-teal-500', gradient: 'from-teal-50/40 to-white dark:from-teal-900/10 dark:to-card' },
    { title: 'Total Penjualan', value: formatNumber(data.totalOrders), icon: ShoppingCart, trend: '+18%', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-l-green-500', gradient: 'from-green-50/40 to-white dark:from-green-900/10 dark:to-card' },
    { title: 'Total Subsidi', value: formatRupiah(data.totalSubsidy), icon: Banknote, trend: '+8%', color: 'text-lime-600 dark:text-lime-400', bgColor: 'bg-lime-50 dark:bg-lime-900/20', borderColor: 'border-l-lime-500', gradient: 'from-lime-50/40 to-white dark:from-lime-900/10 dark:to-card' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <motion.div key={stat.title} variants={itemVariants}>
          <Card className={`border-l-4 ${stat.borderColor} bg-gradient-to-br ${stat.gradient} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`} style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                  <p className="text-xl font-bold mt-1.5">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">{stat.trend}</span>
                    <span className="text-xs text-muted-foreground">dari bulan lalu</span>
                  </div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor} shadow-sm ring-1 ring-black/5 dark:ring-white/5`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

function MonthlySales({ data }: { data: DashboardData }) {
  const maxTotal = Math.max(...data.monthlySales.map((m) => m.total), 1)
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
                <Progress value={(m.total / maxTotal) * 100} className="h-2" />
              </div>
            ))}
          </div>
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
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">{formatNumber(p.value)} kg</span>
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
              ) : data.recentOrders.map((order) => (
                <TableRow key={order.id} className="hover:border-l-2 hover:border-l-primary/30">
                  <TableCell className="text-xs font-mono">{order.orderNumber}</TableCell>
                  <TableCell className="text-xs">{order.farmer.name}</TableCell>
                  <TableCell className="text-xs text-right">{formatRupiah(order.totalAmount)}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StockAlerts({ data }: { data: DashboardData }) {
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
                <TableHeader><TableRow><TableHead className="text-xs">Gudang</TableHead><TableHead className="text-xs">Produk</TableHead><TableHead className="text-xs text-right">Stok</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.stockAlerts.map((s) => {
                    const ratio = s.quantity / s.minStock
                    const borderClass = ratio <= 0.5
                      ? 'border-l-2 border-l-red-400'
                      : 'border-l-2 border-l-yellow-400'
                    return (
                      <TableRow key={s.id} className={borderClass}>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full pulse-dot ${ratio <= 0.5 ? 'bg-red-500' : 'bg-yellow-500'}`} />
                            {s.warehouse.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{s.product.name}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatNumber(s.quantity)} kg</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStockStatusColor(s.quantity, s.minStock)}`}>{getStockStatusLabel(s.quantity, s.minStock)}</Badge></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
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
            <TableHeader><TableRow><TableHead className="text-xs w-10">#</TableHead><TableHead className="text-xs">Nama</TableHead><TableHead className="text-xs text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.topFarmers.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">Belum ada data</TableCell></TableRow>
              ) : data.topFarmers.map((f, i) => (
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
                        <span className="text-sm">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                      {f.name}
                    </div>
                  </TableCell>
                  <TableCell className={`text-xs text-right font-semibold ${i < 3 ? medalTextColors[i] : ''}`}>{formatRupiah(f.totalAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

  const totalStock = (stockData || []).reduce((sum, s) => sum + s.quantity, 0)

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
      value: `${formatNumber(totalStock)} kg`,
      icon: Package,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      borderColor: 'border-teal-200 dark:border-teal-800',
    },
    {
      title: 'Rata-rata Harga Subsidi/kg',
      value: formatRupiah(Math.round(avgSubsidyPrice)),
      icon: TrendingDown,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      title: 'Distribusi Bulan Ini',
      value: `${formatNumber(distThisMonth)} pengiriman`,
      icon: Truck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    },
  ]

  return (
    <motion.div variants={itemVariants}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <Card key={card.title} className={`border ${card.borderColor} hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.bgColor} ring-1 ring-black/5 dark:ring-white/5`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground leading-tight truncate uppercase tracking-wide">{card.title}</p>
                <p className="text-sm font-bold mt-0.5 truncate">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
      <StatsCards data={data} />
      <QuickInfoCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlySales data={data} />
        <ProductDistribution data={data} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrders data={data} />
        <StockAlerts data={data} />
      </div>
      <TopFarmers data={data} />
    </motion.div>
  )
}