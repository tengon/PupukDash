'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchDashboard, type DashboardData } from '@/lib/api'
import { formatRupiah, formatNumber, getStatusColor, getStatusLabel, getStockStatusColor, getStockStatusLabel } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { motion } from 'framer-motion'
import { Users, Package, ShoppingCart, Banknote, TrendingUp, AlertTriangle, Award } from 'lucide-react'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

function StatsCards({ data }: { data: DashboardData }) {
  const stats = [
    { title: 'Total Petani', value: formatNumber(data.totalFarmers), icon: Users, trend: '+12%', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: 'Total Produk', value: formatNumber(data.totalProducts), icon: Package, trend: '+5%', color: 'text-teal-600', bgColor: 'bg-teal-50' },
    { title: 'Total Penjualan', value: formatNumber(data.totalOrders), icon: ShoppingCart, trend: '+18%', color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: 'Total Subsidi', value: formatRupiah(data.totalSubsidy), icon: Banknote, trend: '+8%', color: 'text-lime-600', bgColor: 'bg-lime-50' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <motion.div key={stat.title} variants={itemVariants}>
          <Card className="hover:shadow-md transition-shadow">
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
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
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
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Peringatan Stok
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            {data.stockAlerts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Semua stok dalam kondisi aman ✓</div>
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
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Petani Terbaik
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
                  <TableCell className="text-xs font-bold text-primary">{i + 1}</TableCell>
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