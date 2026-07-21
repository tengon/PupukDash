'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchDashboard, type DashboardData } from '@/lib/api'
import { formatRupiah, formatNumber, formatDate, getStatusColor, getStatusLabel, getStockStatusColor, getStockStatusLabel } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  Users,
  Package,
  ShoppingCart,
  Banknote,
  TrendingUp,
  AlertTriangle,
  Award,
} from 'lucide-react'

const barChartConfig = {
  total: { label: 'Penjualan', color: 'oklch(0.45 0.15 150)' },
  subsidy: { label: 'Subsidi', color: 'oklch(0.72 0.10 140)' },
} satisfies ChartConfig

const PIE_COLORS = [
  'oklch(0.45 0.15 150)',
  'oklch(0.55 0.14 155)',
  'oklch(0.65 0.12 145)',
  'oklch(0.72 0.10 140)',
  'oklch(0.38 0.12 160)',
]

const pieChartConfig = {
  value: { label: 'Penjualan' },
  UREA: { label: 'UREA', color: PIE_COLORS[0] },
  NPK: { label: 'NPK', color: PIE_COLORS[1] },
  'SP-36': { label: 'SP-36', color: PIE_COLORS[2] },
  ZA: { label: 'ZA', color: PIE_COLORS[3] },
  ORGANIK: { label: 'ORGANIK', color: PIE_COLORS[4] },
} satisfies ChartConfig

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function StatsCards({ data }: { data: DashboardData }) {
  const stats = [
    {
      title: 'Total Petani',
      value: formatNumber(data.totalFarmers),
      icon: Users,
      trend: '+12%',
      trendUp: true,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Total Produk',
      value: formatNumber(data.totalProducts),
      icon: Package,
      trend: '+5%',
      trendUp: true,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'Total Penjualan',
      value: formatNumber(data.totalOrders),
      icon: ShoppingCart,
      trend: '+18%',
      trendUp: true,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Subsidi',
      value: formatRupiah(data.totalSubsidy),
      icon: Banknote,
      trend: '+8%',
      trendUp: true,
      color: 'text-lime-600',
      bgColor: 'bg-lime-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <motion.div key={stat.title} variants={itemVariants}>
          <Card className="hover:shadow-md">
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

function SalesChart({ data }: { data: DashboardData }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Penjualan Bulanan</CardTitle>
          <CardDescription>6 bulan terakhir</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ChartContainer config={barChartConfig} className="h-[280px] w-full">
            <BarChart data={data.monthlySales} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="subsidy" fill="var(--color-subsidy)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ProductPieChart({ data }: { data: DashboardData }) {
  const chartData = data.productDistribution.map((item) => ({
    ...item,
    fill: PIE_COLORS[data.productDistribution.indexOf(item) % PIE_COLORS.length],
  }))

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribusi per Jenis Pupuk</CardTitle>
          <CardDescription>Proporsi penjualan</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={pieChartConfig} className="h-[280px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={11}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function RecentOrders({ data }: { data: DashboardData }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pesanan Terbaru</CardTitle>
          <CardDescription>5 pesanan terakhir</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">No. Pesanan</TableHead>
                <TableHead className="text-xs">Petani</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-xs font-mono">{order.orderNumber}</TableCell>
                  <TableCell className="text-xs">{order.farmer.name}</TableCell>
                  <TableCell className="text-xs text-right">{formatRupiah(order.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
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
      <Card className="hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Peringatan Stok
          </CardTitle>
          <CardDescription>Produk dengan stok rendah</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            {data.stockAlerts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Semua stok dalam kondisi aman
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Gudang</TableHead>
                    <TableHead className="text-xs">Produk</TableHead>
                    <TableHead className="text-xs text-right">Stok</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.stockAlerts.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.warehouse.name}</TableCell>
                      <TableCell className="text-xs">{s.product.name}</TableCell>
                      <TableCell className="text-xs text-right">{formatNumber(s.quantity)} kg</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStockStatusColor(s.quantity, s.minStock)}`}>
                          {getStockStatusLabel(s.quantity, s.minStock)}
                        </Badge>
                      </TableCell>
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
      <Card className="hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Petani Terbaik
          </CardTitle>
          <CardDescription>Berdasarkan volume pembelian</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8">#</TableHead>
                  <TableHead className="text-xs">Nama</TableHead>
                  <TableHead className="text-xs text-right">Pesanan</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topFarmers.map((f, i) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs font-bold text-primary">{i + 1}</TableCell>
                    <TableCell className="text-xs font-medium">{f.name}</TableCell>
                    <TableCell className="text-xs text-right">{f.totalOrders}</TableCell>
                    <TableCell className="text-xs text-right">{formatRupiah(f.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function DashboardView() {
  const { refreshKey } = useAppStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', refreshKey],
    queryFn: fetchDashboard,
  })

  if (isLoading) return <DashboardSkeleton />

  if (isError || !data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Gagal memuat data dashboard. Pastikan data seed sudah dijalankan.</p>
      </Card>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <StatsCards data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={data} />
        <ProductPieChart data={data} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrders data={data} />
        <StockAlerts data={data} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopFarmers data={data} />
        <Card className="hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Ringkasan Bulan Ini</CardTitle>
            <CardDescription>Informasi penting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Total Penjualan Bulan Ini</span>
                <span className="text-sm font-bold">
                  {data.monthlySales.length > 0
                    ? formatRupiah(data.monthlySales[data.monthlySales.length - 1].total)
                    : 'Rp 0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Total Subsidi Bulan Ini</span>
                <span className="text-sm font-bold">
                  {data.monthlySales.length > 0
                    ? formatRupiah(data.monthlySales[data.monthlySales.length - 1].subsidy)
                    : 'Rp 0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Stok Peringatan</span>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  {data.stockAlerts.length} item
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Pesanan Menunggu</span>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  {data.recentOrders.filter((o) => o.status === 'PENDING').length} pesanan
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}