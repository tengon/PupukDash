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
import { Users, Package, ShoppingCart, Banknote, TrendingUp, AlertTriangle, Award, TrendingDown, Truck } from 'lucide-react'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

function StatsCards({ data }: { data: DashboardData }) {
  const stats = [
    { title: 'Total Petani', value: formatNumber(data.totalFarmers), icon: Users, trend: '+12%', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-l-emerald-400', hoverBg: 'hover:bg-gradient-to-br hover:from-emerald-50/60 hover:to-white' },
    { title: 'Total Produk', value: formatNumber(data.totalProducts), icon: Package, trend: '+5%', color: 'text-teal-600', bgColor: 'bg-teal-50', borderColor: 'border-l-teal-400', hoverBg: 'hover:bg-gradient-to-br hover:from-teal-50/60 hover:to-white' },
    { title: 'Total Penjualan', value: formatNumber(data.totalOrders), icon: ShoppingCart, trend: '+18%', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-l-green-400', hoverBg: 'hover:bg-gradient-to-br hover:from-green-50/60 hover:to-white' },
    { title: 'Total Subsidi', value: formatRupiah(data.totalSubsidy), icon: Banknote, trend: '+8%', color: 'text-lime-600', bgColor: 'bg-lime-50', borderColor: 'border-l-lime-400', hoverBg: 'hover:bg-gradient-to-br hover:from-lime-50/60 hover:to-white' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <motion.div key={stat.title} variants={itemVariants}>
          <Card className={`border-l-4 ${stat.borderColor} hover:shadow-md transition-all duration-300 ${stat.hoverBg}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">{stat.trend}</span>
                    <span className="text-xs text-muted-foreground">dari bulan lalu</span>
                  </div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor} shadow-sm`}>
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
      <Card className="hover:shadow-md transition-shadow">
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
      <Card className="hover:shadow-md transition-shadow">
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
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pesanan Terbaru</CardTitle>
          <CardDescription>5 pesanan terakhir</CardDescription>
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
                <TableRow key={order.id}>
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
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 animate-pulse-gentle" />
            <span>Peringatan Stok</span>
            {data.stockAlerts.length > 0 && (
              <span className="ml-auto text-[10px] font-medium bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                {data.stockAlerts.length} item
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            {data.stockAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-emerald-50 mb-2">
                  <AlertTriangle className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground">Semua stok dalam kondisi aman</p>
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">Gudang</TableHead><TableHead className="text-xs">Produk</TableHead><TableHead className="text-xs text-right">Stok</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.stockAlerts.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.warehouse.name}</TableCell>
                      <TableCell className="text-xs">{s.product.name}</TableCell>
                      <TableCell className="text-xs text-right">{formatNumber(s.quantity)} kg</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStockStatusColor(s.quantity, s.minStock)}`}>{getStockStatusLabel(s.quantity, s.minStock)}</Badge></TableCell>
                    </TableRow>
                  ))}
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
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <span>Petani Terbaik</span>
            <span className="ml-auto text-[10px] font-medium text-muted-foreground">Berdasarkan total pembelian</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="text-xs w-8">#</TableHead><TableHead className="text-xs">Nama</TableHead><TableHead className="text-xs text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.topFarmers.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">Belum ada data</TableCell></TableRow>
              ) : data.topFarmers.map((f, i) => (
                <TableRow key={f.id}>
                  <TableCell className="text-xs font-bold">
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'text-primary'}`}>
                      {i + 1}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{f.name}</TableCell>
                  <TableCell className="text-xs text-right">{formatRupiah(f.totalAmount)}</TableCell>
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
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'Rata-rata Harga Subsidi/kg',
      value: formatRupiah(Math.round(avgSubsidyPrice)),
      icon: TrendingDown,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Distribusi Bulan Ini',
      value: `${formatNumber(distThisMonth)} pengiriman`,
      icon: Truck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ]

  return (
    <motion.div variants={itemVariants}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <Card key={card.title} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{card.title}</p>
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