'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  fetchOrders, fetchFarmers, fetchWarehouses, fetchProducts,
  createOrder, updateOrder,
  type OrderWithDetails, type Farmer, type Warehouse, type Product,
} from '@/lib/api'
import { formatRupiah, formatNumber, formatDate, getStatusColor, getStatusLabel, getTypeBadgeColor } from '@/lib/format'
import { exportToCSV } from '@/lib/export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { Plus, Search, ShoppingCart, Eye, ArrowRight, Minus, Download, Printer, Check, Clock, PackageCheck, CalendarDays, X, Package, Calculator, Banknote, Weight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { validateHET, getAllocationWarning, getHETPrice, normalizeProductType } from '@/lib/het'

const ITEMS_PER_PAGE = 10

const ORDER_STATUS_TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'CONFIRMED', label: 'Dikonfirmasi' },
  { value: 'PICKED_UP', label: 'Diambil' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

const ORDER_STATUS_FLOW: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: [],
  CANCELLED: [],
}

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PICKED_UP'] as const
const STEP_LABELS: Record<string, string> = {
  PENDING: 'Menunggu',
  CONFIRMED: 'Dikonfirmasi',
  PICKED_UP: 'Diambil',
}
const STEP_ICONS: Record<string, typeof Check> = {
  PENDING: Clock,
  CONFIRMED: Check,
  PICKED_UP: PackageCheck,
}

function OrderStatusTimeline({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center justify-center py-4">
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 px-3 py-1">
          Pesanan Dibatalkan
        </Badge>
      </div>
    )
  }

  const currentIdx = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number])

  return (
    <div className="flex items-center justify-center py-4 px-2">
      <div className="flex items-center gap-0 w-full max-w-xs">
        {STATUS_STEPS.map((step, idx) => {
          const StepIcon = STEP_ICONS[step]
          const isCompleted = idx < currentIdx
          const isCurrent = idx === currentIdx
          const isFuture = idx > currentIdx

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                        ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/40 dark:text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                        : 'bg-muted border-muted-foreground/30 text-muted-foreground/50'
                  }`}
                >
                  <StepIcon className="h-4 w-4" />
                </div>
                <span className={`text-[10px] mt-1 font-medium ${
                  isCompleted || isCurrent ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
                }`}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${
                  idx < currentIdx
                    ? 'bg-green-500'
                    : 'bg-muted-foreground/20'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface OrderItemForm {
  productId: string
  productName: string
  productType: string
  quantity: number
  pricePerKg: number
  subsidyPrice: number
  subtotal: number
  subsidySubtotal: number
  hetWarning: string
}

export function OrdersView() {
  const { refreshKey, triggerRefresh, shortcutAction, clearShortcut, prefillFarmerId, setPrefillFarmerId } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [detailOrder, setDetailOrder] = useState<OrderWithDetails | null>(null)
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null)
  const [page, setPage] = useState(1)
  const [prefillFarmer, setPrefillFarmer] = useState<string | undefined>(undefined)

  const [formFarmer, setFormFarmer] = useState('')
  const [formWarehouse, setFormWarehouse] = useState('')
  const [formItems, setFormItems] = useState<OrderItemForm[]>([])
  const [formNotes, setFormNotes] = useState('')
  const [farmerSearch, setFarmerSearch] = useState('')

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', refreshKey, statusFilter, fromDate, toDate],
    queryFn: () => fetchOrders({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
  })

  const orders = ordersData?.orders ?? []
  const orderSummary = ordersData?.summary

  const { data: farmers } = useQuery({
    queryKey: ['farmers', refreshKey],
    queryFn: fetchFarmers,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', refreshKey],
    queryFn: fetchWarehouses,
  })

  const { data: products } = useQuery({
    queryKey: ['products', refreshKey],
    queryFn: () => fetchProducts(),
  })

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      triggerRefresh()
      setCreateOpen(false)
      resetCreateForm()
      toast({ title: 'Berhasil', description: 'Pesanan berhasil dibuat' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; notes?: string } }) => updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      triggerRefresh()
      setStatusOpen(false)
      setEditingOrder(null)
      toast({ title: 'Berhasil', description: 'Status pesanan diperbarui' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const resetCreateForm = () => {
    setFormFarmer(prefillFarmer || '')
    setFormWarehouse('')
    setFormItems([])
    setFormNotes('')
    setFarmerSearch('')
    setPrefillFarmer(undefined)
  }

  const addItem = () => {
    setFormItems([...formItems, {
      productId: '',
      productName: '',
      productType: '',
      quantity: 0,
      pricePerKg: 0,
      subsidyPrice: 0,
      subtotal: 0,
      subsidySubtotal: 0,
      hetWarning: '',
    }])
  }

  const removeItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  // Dapatkan data petani yang dipilih untuk validasi alokasi
  const selectedFarmer = formFarmer ? (farmers || []).find((f) => f.id === formFarmer) : null
  const farmerLandArea = selectedFarmer?.landAreaHa ?? null

  const updateItem = (index: number, field: keyof OrderItemForm, value: string | number) => {
    const updated = [...formItems]
    ;(updated[index] as unknown as Record<string, string | number>)[field] = value

    if (field === 'productId' && typeof value === 'string') {
      const product = (products || []).find((p) => p.id === value)
      if (product) {
        updated[index].productName = product.name
        updated[index].productType = product.type
        updated[index].pricePerKg = product.pricePerKg
        updated[index].subsidyPrice = product.subsidyPrice
      }
    }

    updated[index].subtotal = updated[index].quantity * updated[index].pricePerKg
    updated[index].subsidySubtotal = updated[index].quantity * updated[index].subsidyPrice

    // Hitung peringatan HET untuk item ini
    if (updated[index].productId && updated[index].quantity > 0) {
      updated[index].hetWarning = getAllocationWarning(
        updated[index].productType || updated[index].productName,
        updated[index].quantity,
        farmerLandArea,
      )
    } else {
      updated[index].hetWarning = ''
    }

    setFormItems(updated)
  }

  const totals = useMemo(() => {
    const totalAmount = formItems.reduce((sum, item) => sum + item.subtotal, 0)
    const totalSubsidy = formItems.reduce((sum, item) => sum + item.subsidySubtotal, 0)
    return { totalAmount, totalSubsidy }
  }, [formItems])

  const handleCreate = () => {
    if (!formFarmer || !formWarehouse || formItems.length === 0) {
      toast({ title: 'Validasi', description: 'Lengkapi petani, gudang, dan minimal 1 item', variant: 'destructive' })
      return
    }
    const validItems = formItems.filter((i) => i.productId && i.quantity > 0)
    if (validItems.length === 0) {
      toast({ title: 'Validasi', description: 'Tambahkan minimal 1 item produk', variant: 'destructive' })
      return
    }

    // Validasi HET sebelum mengirim
    const selectedFarmerForHET = formFarmer ? (farmers || []).find((f) => f.id === formFarmer) : null
    const hetResult = validateHET(validItems, selectedFarmerForHET?.landAreaHa ?? null)
    if (!hetResult.valid) {
      toast({
        title: 'Validasi HET Gagal',
        description: hetResult.errors.join('\n'),
        variant: 'destructive',
      })
      return
    }

    createMutation.mutate({
      farmerId: formFarmer,
      warehouseId: formWarehouse,
      items: validItems.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        pricePerKg: i.pricePerKg,
        subtotal: i.subtotal,
      })),
      totalAmount: totals.totalAmount,
      totalSubsidy: totals.totalSubsidy,
      notes: formNotes || undefined,
    })
  }

  const handleStatusUpdate = (newStatus: string) => {
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data: { status: newStatus } })
    }
  }

  const filteredFarmers = useMemo(() => {
    if (!farmers) return []
    if (!farmerSearch) return farmers
    return farmers.filter(
      (f) => f.name.toLowerCase().includes(farmerSearch.toLowerCase()) || f.nik.includes(farmerSearch)
    )
  }, [farmers, farmerSearch])

  // Handle keyboard shortcut from page.tsx
  const prevShortcutRef = useRef<string | null>(null)
  useEffect(() => {
    if (shortcutAction && shortcutAction !== prevShortcutRef.current) {
      prevShortcutRef.current = shortcutAction
      if (shortcutAction === 'create-order') {
        resetCreateForm()
        const id = setTimeout(() => setCreateOpen(true), 0)
        clearShortcut()
        return () => clearTimeout(id)
      }
      if (shortcutAction === 'focus-search') {
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Cari pesanan..."]')
        if (input) input.focus()
        clearShortcut()
      }
    }
  }, [shortcutAction, clearShortcut])

  const handlePrintOrder = (order: OrderWithDetails) => {
    const now = new Date()
    const printedAt = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(now)

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Bukti Pesanan - ${order.orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 32px; color: #1a1a1a; font-size: 13px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #16a34a; padding-bottom: 16px; }
    .header h1 { font-size: 18px; color: #16a34a; margin-bottom: 4px; }
    .header .subtitle { font-size: 12px; color: #666; }
    .header .date { font-size: 11px; color: #888; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
    .info-item { font-size: 12px; }
    .info-item .label { color: #666; }
    .info-item .value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 12px; }
    th { background-color: #f0fdf4; font-weight: 600; color: #166534; }
    td.num { text-align: right; font-family: 'Courier New', monospace; }
    .totals { margin-left: auto; width: 260px; border: 1px solid #ddd; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 12px; }
    .totals .row + .row { border-top: 1px solid #eee; }
    .totals .row.total { font-weight: 700; background: #f0fdf4; color: #166534; }
    .totals .row.subsidy { font-weight: 700; color: #16a34a; }
    .totals .row.diff { font-weight: 700; color: #065f46; }
    .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>SI PUPUK - Bukti Pesanan</h1>
    <div class="subtitle">Sistem Informasi Penjualan Pupuk Bersubsidi</div>
    <div class="date">Tanggal Pesanan: ${formatDate(order.createdAt)}</div>
  </div>
  <div class="info-grid">
    <div class="info-item"><span class="label">No. Pesanan:</span> <span class="value">${order.orderNumber}</span></div>
    <div class="info-item"><span class="label">Status:</span> <span class="value">${getStatusLabel(order.status)}</span></div>
    <div class="info-item"><span class="label">Petani:</span> <span class="value">${order.farmer.name}</span></div>
    <div class="info-item"><span class="label">NIK:</span> <span class="value">${order.farmer.nik}</span></div>
    <div class="info-item" style="grid-column: span 2"><span class="label">Gudang:</span> <span class="value">${order.warehouse.name} (${order.warehouse.code}</span></div>
  </div>
  <table>
    <thead>
      <tr><th>Produk</th><th style="text-align:right">Qty (kg)</th><th style="text-align:right">Harga/kg</th><th style="text-align:right">Subtotal</th></tr>
    </thead>
    <tbody>
      ${order.items.map((item) => `
      <tr>
        <td>${item.productName}</td>
        <td class="num">${formatNumber(item.quantity)}</td>
        <td class="num">${formatRupiah(item.pricePerKg)}</td>
        <td class="num">${formatRupiah(item.subtotal)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Total Harga Normal</span><span>${formatRupiah(order.totalAmount)}</span></div>
    <div class="row subsidy"><span>Total Harga Subsidi</span><span>${formatRupiah(order.totalSubsidy)}</span></div>
    <div class="row diff"><span>Selisih Subsidi</span><span>${formatRupiah(order.totalAmount - order.totalSubsidy)}</span></div>
  </div>
  ${order.notes ? `<div style="margin-top:12px;font-size:12px"><strong>Catatan:</strong> ${order.notes}</div>` : ''}
  <div class="footer">Dicetak pada: ${printedAt}</div>
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  // Client-side search filter (API handles status + date)
  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.farmer.name.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(safePage * ITEMS_PER_PAGE, filtered.length)

  const clearDateFilter = () => {
    setFromDate('')
    setToDate('')
  }

  const hasDateFilter = fromDate || toDate

  // Expose repeat order function for farmer detail
  useEffect(() => {
    if (prefillFarmer) {
      const id = setTimeout(() => {
        setFormFarmer(prefillFarmer)
        setCreateOpen(true)
      }, 0)
      return () => clearTimeout(id)
    }
  }, [prefillFarmer])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Card className="border-l-2 border-l-green-500">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Penjualan / Pesanan
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={!orders || orders.length === 0}
                onClick={() => {
                  exportToCSV(
                    'pesanan-pupuk',
                    ['No Pesanan', 'Petani', 'NIK', 'Gudang', 'Total', 'Subsidi', 'Status', 'Tanggal'],
                    orders.map((o) => [
                      o.orderNumber,
                      o.farmer.name,
                      o.farmer.nik,
                      o.warehouse.name,
                      o.totalAmount,
                      o.totalSubsidy,
                      getStatusLabel(o.status),
                      formatDate(o.createdAt),
                    ]),
                  )
                }}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button onClick={() => { resetCreateForm(); setCreateOpen(true) }} size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Buat Pesanan
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <TabsList className="h-8">
                  {ORDER_STATUS_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3">
                      {tab.label}
                      {orderSummary?.byStatus[tab.value] !== undefined && (
                        <span className="ml-1 text-[10px] text-muted-foreground">({orderSummary.byStatus[tab.value]})</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2 sm:ml-auto">
                <Button
                  variant={showDateFilter ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setShowDateFilter(!showDateFilter)}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Filter Tanggal
                </Button>
                <div className="relative flex-1 sm:max-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari pesanan..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
            {showDateFilter && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <Label className="text-xs text-muted-foreground shrink-0">Dari:</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
                  className="h-8 text-xs w-auto sm:w-36"
                />
                <Label className="text-xs text-muted-foreground shrink-0">Sampai:</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setPage(1) }}
                  className="h-8 text-xs w-auto sm:w-36"
                />
                {hasDateFilter && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearDateFilter}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Menampilkan {filtered.length > 0 ? `${startIndex}-${endIndex}` : '0'} dari {orderSummary?.total ?? filtered.length} pesanan
                  {hasDateFilter && <span className="ml-1 text-primary">(filter aktif)</span>}
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">No. Pesanan</TableHead>
                      <TableHead className="text-xs">Petani</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Gudang</TableHead>
                      <TableHead className="text-xs text-right">Total (Rp)</TableHead>
                      <TableHead className="text-xs text-right hidden sm:table-cell">Subsidi (Rp)</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Tanggal</TableHead>
                      <TableHead className="text-xs text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ShoppingCart className="h-10 w-10 opacity-30" />
                            <p className="text-sm font-medium">Tidak ada data pesanan</p>
                            {(hasDateFilter || search) && (
                              <p className="text-xs">Coba ubah filter atau kata kunci pencarian</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="text-xs font-mono">{order.orderNumber}</TableCell>
                          <TableCell className="text-sm font-medium">{order.farmer.name}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{order.warehouse.name}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{formatRupiah(order.totalAmount)}</TableCell>
                          <TableCell className="text-xs text-right hidden sm:table-cell text-primary">{formatRupiah(order.totalSubsidy)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {order.status === 'PENDING' && (
                                <span className="inline-block h-2 w-2 rounded-full bg-green-500 pulse-dot shrink-0" />
                              )}
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(order.status)}`}>
                                {getStatusLabel(order.status)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDetailOrder(order); setDetailOpen(true) }}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {ORDER_STATUS_FLOW[order.status]?.length > 0 && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingOrder(order); setStatusOpen(true) }}>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filtered.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Menampilkan {startIndex}-{endIndex} dari {filtered.length} data
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={safePage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                      </PaginationItem>
                      {safePage > 3 && (
                        <>
                          <PaginationItem>
                            <PaginationLink onClick={() => setPage(1)} className="cursor-pointer">1</PaginationLink>
                          </PaginationItem>
                          <PaginationItem><PaginationEllipsis /></PaginationItem>
                        </>
                      )}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p >= safePage - 1 && p <= safePage + 1)
                        .map((p) => (
                          <PaginationItem key={p}>
                            <PaginationLink isActive={p === safePage} onClick={() => setPage(p)} className="cursor-pointer">{p}</PaginationLink>
                          </PaginationItem>
                        ))
                      }
                      {safePage < totalPages - 2 && (
                        <>
                          <PaginationItem><PaginationEllipsis /></PaginationItem>
                          <PaginationItem>
                            <PaginationLink onClick={() => setPage(totalPages)} className="cursor-pointer">{totalPages}</PaginationLink>
                          </PaginationItem>
                        </>
                      )}
                      <PaginationItem>
                        <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={safePage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setPrefillFarmer(undefined) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Pesanan Baru</DialogTitle>
            <DialogDescription>Isi data pesanan pembelian pupuk bersubsidi</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Petani *</Label>
                <Select value={formFarmer} onValueChange={setFormFarmer}>
                  <SelectTrigger><SelectValue placeholder="Pilih petani" /></SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Cari nama atau NIK..."
                        value={farmerSearch}
                        onChange={(e) => setFarmerSearch(e.target.value)}
                        className="h-8 text-xs mb-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {filteredFarmers.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name} — {f.nik}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Gudang *</Label>
                <Select value={formWarehouse} onValueChange={setFormWarehouse}>
                  <SelectTrigger><SelectValue placeholder="Pilih gudang" /></SelectTrigger>
                  <SelectContent>
                    {(warehouses || []).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold">Item Pesanan</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Tambah Item
                </Button>
              </div>

              {formItems.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Belum ada item. Klik &quot;Tambah Item&quot; untuk menambahkan produk.
                </div>
              ) : (
                <ScrollArea className="max-h-60">
                  <div className="space-y-3 pr-3">
                    {formItems.map((item, idx) => {
                      const hetPrice = item.productType ? getHETPrice(item.productType) : null
                      return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/50 rounded-lg">
                        <div className="col-span-12 sm:col-span-5">
                          <Label className="text-[10px] text-muted-foreground">Produk</Label>
                          <Select value={item.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>
                              {(products || []).filter(p => p.isActive !== false).map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {item.productId && (
                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                              {hetPrice !== null && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">
                                  <Weight className="h-2.5 w-2.5" />
                                  HET: {formatRupiah(hetPrice)}/kg
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded font-medium">
                                <Banknote className="h-2.5 w-2.5" />
                                Subsidi: {item.subsidyPrice ? formatRupiah(item.subsidyPrice) : '-'}
                              </span>
                              {item.pricePerKg > item.subsidyPrice && item.subsidyPrice > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded font-medium">
                                  <Calculator className="h-2.5 w-2.5" />
                                  Hemat: {formatRupiah(item.pricePerKg - item.subsidyPrice)}/kg
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Label className="text-[10px] text-muted-foreground">Qty (kg)</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                          {item.hetWarning && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 leading-tight">{item.hetWarning}</p>
                          )}
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Label className="text-[10px] text-muted-foreground">Harga/kg</Label>
                          <div className="h-8 flex items-center text-xs font-mono">
                            {item.pricePerKg ? formatRupiah(item.pricePerKg) : '-'}
                          </div>
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Label className="text-[10px] text-muted-foreground">Subtotal</Label>
                          <div className="h-8 flex items-center text-xs font-mono font-medium">
                            {item.subtotal ? formatRupiah(item.subtotal) : 'Rp 0'}
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-1 flex justify-end mt-4 sm:mt-5">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {formItems.length > 0 && (
              <div className="rounded-lg p-4 space-y-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/60 dark:border-green-700/40">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Ringkasan Pesanan</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Harga Normal</span>
                  <span className="font-medium transition-all duration-300"><span className="text-xs text-muted-foreground">Rp </span>{formatRupiah(totals.totalAmount).replace(/^Rp\s*/, '')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Harga Subsidi</span>
                  <span className="font-bold text-primary transition-all duration-300"><span className="text-xs text-primary/60">Rp </span>{formatRupiah(totals.totalSubsidy).replace(/^Rp\s*/, '')}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-green-200/60 dark:border-green-700/40">
                  <span className="text-muted-foreground">Selisih Subsidi</span>
                  <span className="font-bold text-green-700 dark:text-green-400 transition-all duration-300"><span className="text-xs text-green-600/60 dark:text-green-500/60">Rp </span>{formatRupiah(totals.totalAmount - totals.totalSubsidy).replace(/^Rp\s*/, '')}</span>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Catatan</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Catatan tambahan..." rows={2} />
            </div>

            {formItems.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Total Item</p>
                    <p className="text-sm font-bold">{formItems.filter(i => i.productId && i.quantity > 0).length}</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30 shrink-0">
                    <Weight className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Total Berat</p>
                    <p className="text-sm font-bold">{formatNumber(formItems.reduce((s, i) => s + i.quantity, 0))} kg</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                    <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Total Harga Normal</p>
                    <p className="text-sm font-bold">{formatRupiah(totals.totalAmount)}</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                    <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Total Subsidi</p>
                    <p className="text-sm font-bold text-primary">{formatRupiah(totals.totalSubsidy)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : 'Buat Pesanan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-2">
              <div>
                <DialogTitle>Detail Pesanan</DialogTitle>
                <DialogDescription>
                  {detailOrder && <span className="font-mono">{detailOrder.orderNumber}</span>}
                </DialogDescription>
              </div>
              {detailOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handlePrintOrder(detailOrder)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Cetak
                </Button>
              )}
            </div>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-2">
                <OrderStatusTimeline status={detailOrder.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Petani:</span> <span className="font-medium">{detailOrder.farmer.name}</span></div>
                <div><span className="text-muted-foreground">Gudang:</span> <span className="font-medium">{detailOrder.warehouse.name}</span></div>
                <div><span className="text-muted-foreground">Tanggal:</span> {formatDate(detailOrder.createdAt)}</div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(detailOrder.status)}`}>
                    {getStatusLabel(detailOrder.status)}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Item Pesanan</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Produk</TableHead>
                      <TableHead className="text-xs text-right">Qty (kg)</TableHead>
                      <TableHead className="text-xs text-right">Harga/kg</TableHead>
                      <TableHead className="text-xs text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm py-2">
                          <div className="flex items-center gap-2">
                            {item.productName}
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${getTypeBadgeColor(item.product?.type || '')}`}>
                              {item.product?.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono">{formatNumber(item.quantity)}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{formatRupiah(item.pricePerKg)}</TableCell>
                        <TableCell className="text-sm text-right font-mono font-medium">{formatRupiah(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Separator />
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                {/* Stacked Bar: Base Price vs Subsidy */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Perbandingan Harga Normal vs Subsidi</p>
                  <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full bg-primary/70 transition-all duration-500"
                      style={{ width: `${detailOrder.totalAmount > 0 ? (detailOrder.totalSubsidy / detailOrder.totalAmount) * 100 : 0}%` }}
                      title={`Harga Subsidi: ${formatRupiah(detailOrder.totalSubsidy)}`}
                    />
                    <div
                      className="h-full bg-orange-400/70 transition-all duration-500"
                      style={{ width: `${detailOrder.totalAmount > 0 ? ((detailOrder.totalAmount - detailOrder.totalSubsidy) / detailOrder.totalAmount) * 100 : 0}%` }}
                      title={`Selisih Subsidi: ${formatRupiah(detailOrder.totalAmount - detailOrder.totalSubsidy)}`}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-1.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-sm bg-primary/70" />
                      Harga Subsidi
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-sm bg-orange-400/70" />
                      Selisih Subsidi
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Harga Normal</span>
                  <span className="font-medium">{formatRupiah(detailOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Harga Subsidi</span>
                  <span className="font-bold text-primary">{formatRupiah(detailOrder.totalSubsidy)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Selisih Subsidi</span>
                  <span className="font-bold text-green-600">{formatRupiah(detailOrder.totalAmount - detailOrder.totalSubsidy)}</span>
                </div>
              </div>
              {detailOrder.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Catatan:</span> {detailOrder.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Status Pesanan</DialogTitle>
            <DialogDescription>
              {editingOrder && (
                <span>Pesanan <span className="font-mono font-medium">{editingOrder.orderNumber}</span> — Status: <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(editingOrder.status)}`}>{getStatusLabel(editingOrder.status)}</Badge></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {editingOrder && ORDER_STATUS_FLOW[editingOrder.status]?.map((nextStatus) => (
              <Button
                key={nextStatus}
                variant="outline"
                className="justify-start h-12"
                onClick={() => handleStatusUpdate(nextStatus)}
                disabled={updateMutation.isPending}
              >
                <ArrowRight className="h-4 w-4 mr-2 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium">{getStatusLabel(nextStatus)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {nextStatus === 'CONFIRMED' && 'Konfirmasi pesanan oleh gudang'}
                    {nextStatus === 'PICKED_UP' && 'Pupuk sudah diambil oleh petani'}
                    {nextStatus === 'CANCELLED' && 'Batalkan pesanan ini'}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}