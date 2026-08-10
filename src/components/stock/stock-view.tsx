'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  fetchStock, addStock, updateStock, deleteStock,
  fetchWarehouses, fetchProducts, fetchPptsStock,
  type StockWithProductAndWarehouse, type PptsStockItem
} from '@/lib/api'
import { formatNumber, getTypeBadgeColor, getProductImage } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Boxes, AlertTriangle, Search, Warehouse as WarehouseIcon, Layers, PackagePlus, ArrowLeftRight, Store, RefreshCw, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import { QuickRestockDialog } from './quick-restock-dialog'
import { StockTransferDialog } from './stock-transfer-dialog'

const ITEMS_PER_PAGE = 10
const MAX_CAPACITY = 20000 // reference max for fill indicator

function StockLevelBar({ quantity, minStock }: { quantity: number; minStock: number }) {
  const ratio = quantity / minStock
  const percent = Math.min((ratio / 2) * 100, 100)

  let barColor = 'bg-green-500'
  let bgColor = 'bg-green-100 dark:bg-green-900/30'
  if (ratio < 1) {
    barColor = 'bg-red-500'
    bgColor = 'bg-red-100 dark:bg-red-900/30'
  } else if (ratio < 1.5) {
    barColor = 'bg-yellow-500'
    bgColor = 'bg-yellow-100 dark:bg-yellow-900/30'
  }

  return (
    <div className={`w-full h-2 rounded-full ${bgColor} overflow-hidden`}>
      <div
        className={`h-full rounded-full ${barColor} transition-all duration-500`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function FillIndicatorBar({ quantity }: { quantity: number }) {
  const fillPercent = Math.min((quantity / MAX_CAPACITY) * 100, 100)

  let fillColor = 'bg-green-500'
  if (fillPercent < 20) fillColor = 'bg-red-500'
  else if (fillPercent < 40) fillColor = 'bg-yellow-500'

  return (
    <div className="stock-fill-bar mt-3">
      <div
        className={`absolute bottom-0 left-0 h-full rounded-full transition-all duration-700 ${fillColor}`}
        style={{ width: `${fillPercent}%` }}
      />
    </div>
  )
}

function CapacityRing({ quantity, maxCapacity = 10000 }: { quantity: number; maxCapacity?: number }) {
  const radius = 28
  const stroke = 4
  const size = (radius + stroke) * 2
  const circumference = 2 * Math.PI * radius
  const percent = Math.min(quantity / maxCapacity, 1)
  const filled = percent * circumference

  let ringColor = 'text-green-500'
  if (percent < 0.2) ringColor = 'text-red-500'
  else if (percent < 0.4) ringColor = 'text-yellow-500'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" className="stroke-muted" strokeWidth={stroke} />
        <circle
          cx={radius + stroke} cy={radius + stroke} r={radius}
          fill="none"
          className={`${ringColor}`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums">{Math.round(percent * 100)}%</span>
    </div>
  )
}

function StockCard({ stock, onEdit, onDelete, onRestock }: {
  stock: StockWithProductAndWarehouse
  onEdit: (s: StockWithProductAndWarehouse) => void
  onDelete: (id: string) => void
  onRestock: (s: StockWithProductAndWarehouse) => void
}) {
  const ratio = stock.quantity / stock.minStock

  let statusColor = 'text-green-700 dark:text-green-400'
  let statusLabel = 'Aman'
  let statusBg = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
  let statusBadgeBg = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-700'
  let statusDotColor = 'bg-green-500'
  if (ratio < 1) {
    statusColor = 'text-red-700 dark:text-red-400'
    statusLabel = 'Kritis'
    statusBg = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    statusBadgeBg = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-700'
    statusDotColor = 'bg-red-500'
  } else if (ratio < 1.5) {
    statusColor = 'text-yellow-700 dark:text-yellow-400'
    statusLabel = 'Rendah'
    statusBg = 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    statusBadgeBg = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700'
    statusDotColor = 'bg-yellow-500'
  }

  const topBorderClass = ratio > 1.5 ? 'border-t-2 border-t-green-500' : ratio >= 1.0 ? 'border-t-2 border-t-yellow-500' : 'border-t-2 border-t-red-500'

  return (
    <Card className={`card-highlight ${topBorderClass} border-l-3 ${statusBg} hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out`} style={{ boxShadow: 'var(--shadow-sm)' }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-border p-1 shrink-0 shadow-sm">
              <img
                src={getProductImage(stock.product.name, (stock.product as { imageUrl?: string | null }).imageUrl)}
                alt={stock.product.name}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground/70 font-medium leading-none block mb-0.5">{stock.warehouse.name}</span>
              <p className="text-base font-semibold truncate">{stock.product.name}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 font-semibold ${getTypeBadgeColor(stock.product.type)}`}>
            {stock.product.type}
          </Badge>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <CapacityRing quantity={stock.quantity} />
          <div>
            <p className={`text-2xl font-bold tabular-nums ${statusColor}`}>{formatNumber(stock.quantity)}</p>
            <p className="text-xs text-muted-foreground">kilogram</p>
          </div>
        </div>

        <StockLevelBar quantity={stock.quantity} minStock={stock.minStock} />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">Kapasitas</span>
          <span className="text-[10px] font-medium text-muted-foreground">{Math.min(Math.round((stock.quantity / MAX_CAPACITY) * 100), 100)}%</span>
        </div>
        <FillIndicatorBar quantity={stock.quantity} />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Min: {formatNumber(stock.minStock)} kg</span>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-semibold ${statusBadgeBg}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotColor} mr-1 ${ratio < 1 ? 'pulse-dot' : ''}`} />
              {statusLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px] text-primary border-primary/30 hover:bg-primary/10 hidden sm:inline-flex" onClick={() => onRestock(stock)}>
              <PackagePlus className="h-3 w-3" />
              Restok
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7 text-primary border-primary/30 hover:bg-primary/10 sm:hidden" onClick={() => onRestock(stock)} title="Restok Cepat">
              <PackagePlus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(stock)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(stock.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface GroupedKiosStock {
  kodeKios: string
  namaKios: string
  lastSyncAt: string
  isNew?: boolean
  isUpdated?: boolean
  totalKg: number
  products: {
    urea?: PptsStockItem
    npk?: PptsStockItem
    organikGranul?: PptsStockItem
    organikCair?: PptsStockItem
    npkFk?: PptsStockItem
    others: PptsStockItem[]
  }
}

function groupStockByKios(items: PptsStockItem[]): GroupedKiosStock[] {
  const map = new Map<string, GroupedKiosStock>()

  items.forEach((item) => {
    if (!map.has(item.kodeKios)) {
      map.set(item.kodeKios, {
        kodeKios: item.kodeKios,
        namaKios: item.namaKios,
        lastSyncAt: item.syncnAt || '',
        isNew: !!item.added_at,
        isUpdated: !!item.updated_at,
        totalKg: 0,
        products: { others: [] }
      })
    }

    const kios = map.get(item.kodeKios)!
    const stokNum = parseFloat(item.stokKg.replace(/\./g, '').replace(',', '.')) || 0
    kios.totalKg += stokNum

    if (!kios.lastSyncAt && item.syncnAt) {
      kios.lastSyncAt = item.syncnAt
    }
    if (item.added_at) kios.isNew = true
    if (item.updated_at) kios.isUpdated = true

    const prodName = (item.namaProduct || '').toLowerCase()
    const prodCode = (item.kodeProduct || '').toUpperCase()

    if (prodCode === 'UN46' || prodName.includes('urea')) {
      kios.products.urea = item
    } else if (prodCode === 'NPKP' || (prodName.includes('npk') && !prodName.includes('khusus') && !prodName.includes('fk'))) {
      kios.products.npk = item
    } else if (prodCode === 'ORGR' || prodName.includes('granul')) {
      kios.products.organikGranul = item
    } else if (prodCode === 'ORCR' || prodName.includes('cair')) {
      kios.products.organikCair = item
    } else if (prodCode === 'NPKFK' || prodName.includes('khusus') || prodName.includes('fk')) {
      kios.products.npkFk = item
    } else {
      kios.products.others.push(item)
    }
  })

  return Array.from(map.values())
}

function GroupedKiosCard({ kios }: { kios: GroupedKiosStock }) {
  const standardProducts = [
    { key: 'urea', label: 'Urea (N 46%)', code: 'UN46', data: kios.products.urea, badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
    { key: 'npk', label: 'NPK Phonska', code: 'NPKP', data: kios.products.npk, badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
    { key: 'organikGranul', label: 'Organik Granul', code: 'ORGR', data: kios.products.organikGranul, badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
    { key: 'organikCair', label: 'Organik Cair', code: 'ORCR', data: kios.products.organikCair, badgeBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20' },
    { key: 'npkFk', label: 'NPK FK', code: 'NPKFK', data: kios.products.npkFk, badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' },
  ]

  let hasStock = kios.totalKg > 0

  return (
    <Card className="card-highlight border-t-2 border-t-blue-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Nama Kios & Kode */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Store className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 bg-background/80 shrink-0 font-semibold">
                {kios.kodeKios}
              </Badge>
              {kios.isNew ? (
                <Badge className="bg-blue-500 text-white text-[9px] px-1.5 py-0">Baru</Badge>
              ) : kios.isUpdated ? (
                <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">Updated</Badge>
              ) : null}
            </div>
            <h4 className="text-sm font-bold truncate leading-snug" title={kios.namaKios}>
              {kios.namaKios}
            </h4>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-muted-foreground block">Total Stok</span>
            <span className="text-sm font-extrabold tabular-nums text-primary">{formatNumber(kios.totalKg)} kg</span>
          </div>
        </div>

        {/* 5 Standard Products in 1 Card */}
        <div className="space-y-1.5">
          {standardProducts.map((prod) => {
            const item = prod.data
            const stokVal = item ? item.stokKg : '0'
            const stokNum = parseFloat(stokVal.replace(/\./g, '').replace(',', '.')) || 0

            let stokBadgeClass = 'bg-muted text-muted-foreground border-border/40'
            if (stokNum > 1000) {
              stokBadgeClass = 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800'
            } else if (stokNum > 0) {
              stokBadgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }

            return (
              <div
                key={prod.key}
                className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/40 hover:bg-background/90 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-bold shrink-0 ${prod.badgeBg}`}>
                    {prod.code}
                  </Badge>
                  <span className="text-xs font-medium truncate">{prod.label}</span>
                </div>
                <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-md border ${stokBadgeClass}`}>
                  {stokVal} kg
                </span>
              </div>
            )
          })}

          {/* Any extra products */}
          {kios.products.others.map((item, idx) => (
            <div
              key={`other_${idx}`}
              className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/40"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold shrink-0">
                  {item.kodeProduct}
                </Badge>
                <span className="text-xs font-medium truncate">{item.namaProduct}</span>
              </div>
              <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-md border bg-muted">
                {item.stokKg} kg
              </span>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40">
          <span className="flex items-center gap-1 font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${hasStock ? 'bg-green-500' : 'bg-red-500'}`} />
            {hasStock ? 'Stok Aktif' : 'Stok Kosong'}
          </span>
          <span className="truncate tabular-nums opacity-80" title={kios.lastSyncAt}>
            Sync: {kios.lastSyncAt || '-'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function StokPptsSection() {
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [sortField, setSortField] = useState<'kodeKios' | 'namaKios' | 'namaProduct' | 'stokKg' | 'syncnAt'>('namaKios')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const { data: pptsStockRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pptsStock', search, productFilter],
    queryFn: () => fetchPptsStock({ search, product: productFilter }),
  })

  const items = pptsStockRes?.data || []
  const totalKios = pptsStockRes?.total_kios || 0
  const totalRecords = pptsStockRes?.total_records || 0
  const scrapedAt = pptsStockRes?.scraped_at ? new Date(pptsStockRes.scraped_at).toLocaleString('id-ID') : '-'

  const totalKg = items.reduce((acc, r) => acc + (parseFloat(r.stokKg.replace(/\./g, '').replace(',', '.')) || 0), 0)

  // Dynamic sorting logic
  const sortedItems = [...items].sort((a, b) => {
    let valA: any = a[sortField] || ''
    let valB: any = b[sortField] || ''

    if (sortField === 'stokKg') {
      valA = parseFloat((a.stokKg || '0').replace(/\./g, '').replace(',', '.')) || 0
      valB = parseFloat((b.stokKg || '0').replace(/\./g, '').replace(',', '.')) || 0
    } else {
      valA = String(valA).toLowerCase()
      valB = String(valB).toLowerCase()
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleSortColumn = (field: 'kodeKios' | 'namaKios' | 'namaProduct' | 'stokKg' | 'syncnAt') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const renderSortIcon = (field: 'kodeKios' | 'namaKios' | 'namaProduct' | 'stokKg' | 'syncnAt') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50 shrink-0" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1 text-primary shrink-0" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-primary shrink-0" />
    )
  }

  // Group items by Kios
  const groupedKiosList = groupStockByKios(items)

  const KIOS_PER_PAGE = 9
  const totalPages = Math.max(1, Math.ceil(groupedKiosList.length / KIOS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pagedKios = groupedKiosList.slice((safePage - 1) * KIOS_PER_PAGE, safePage * KIOS_PER_PAGE)

  // Table pagination
  const TABLE_PER_PAGE = 12
  const totalTablePages = Math.max(1, Math.ceil(sortedItems.length / TABLE_PER_PAGE))
  const pagedTableItems = sortedItems.slice((safePage - 1) * TABLE_PER_PAGE, safePage * TABLE_PER_PAGE)

  const productOptions = ['ALL', 'Urea', 'NPK', 'Organik Granul', 'Organik Cair', 'NPK FK']

  return (
    <Card className="border-l-2 border-l-blue-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Stok Kios iPubers (PPTS)
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
              GOW CM iPubers
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kios / produk..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 h-9 w-full sm:w-56"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel Detail"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('card')}
                title="Tampilan Card per Kios"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={() => refetch()} size="sm" variant="outline" className="h-9 gap-1 shrink-0">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <div className="glass rounded-xl p-3 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Kios Terdaftar</p>
            <p className="text-lg font-bold tabular-nums">{totalKios} <span className="text-xs font-normal text-muted-foreground">kios</span></p>
          </div>
          <div className="glass rounded-xl p-3 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Record Produk</p>
            <p className="text-lg font-bold tabular-nums">{totalRecords} <span className="text-xs font-normal text-muted-foreground">item</span></p>
          </div>
          <div className="glass rounded-xl p-3 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Estimasi Stok</p>
            <p className="text-lg font-bold tabular-nums">{formatNumber(totalKg)} <span className="text-xs font-normal text-muted-foreground">kg</span></p>
          </div>
          <div className="glass rounded-xl p-3 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Sync Terakhir</p>
            <p className="text-xs font-semibold truncate mt-1 text-primary">{scrapedAt}</p>
          </div>
        </div>

        {/* Product Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          {productOptions.map((prod) => (
            <button
              key={prod}
              onClick={() => { setProductFilter(prod); setPage(1) }}
              className={`filter-pill ${productFilter === prod ? 'active' : ''}`}
            >
              {prod === 'ALL' ? 'Semua Produk' : prod}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Store className="h-12 w-12 opacity-30 mb-3" />
            <p className="text-sm font-medium">Belum ada data stok Kios iPubers yang sesuai</p>
            <p className="text-xs opacity-70 mt-1">Pastikan scraper stok_kios_ipuber.js sudah pernah dijalankan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === 'card' ? (
              /* CARD GRID VIEW (1 Card per PPTS containing all 5 products) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedKios.map((kios) => (
                  <GroupedKiosCard key={kios.kodeKios} kios={kios} />
                ))}
              </div>
            ) : (
              /* TABLE VIEW WITH SORTABLE HEADERS */
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs">
                      <TableHead className="w-[140px] cursor-pointer select-none hover:text-foreground" onClick={() => handleSortColumn('kodeKios')}>
                        <div className="flex items-center font-bold">
                          Kode Kios {renderSortIcon('kodeKios')}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSortColumn('namaKios')}>
                        <div className="flex items-center font-bold">
                          Nama Kios (PPTS) {renderSortIcon('namaKios')}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSortColumn('namaProduct')}>
                        <div className="flex items-center font-bold">
                          Produk {renderSortIcon('namaProduct')}
                        </div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none hover:text-foreground" onClick={() => handleSortColumn('stokKg')}>
                        <div className="flex items-center justify-end font-bold">
                          Stok (Kg) {renderSortIcon('stokKg')}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSortColumn('syncnAt')}>
                        <div className="flex items-center font-bold">
                          Sync At (GOW CM) {renderSortIcon('syncnAt')}
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[100px] font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedTableItems.map((item, idx) => {
                      const stokNum = parseFloat(item.stokKg.replace(/\./g, '').replace(',', '.')) || 0
                      let stokBadgeClass = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      if (stokNum === 0) {
                        stokBadgeClass = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      } else if (stokNum < 1000) {
                        stokBadgeClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                      }

                      return (
                        <TableRow key={`${item.kodeKios}_${item.kodeProduct}_${idx}`} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-semibold">{item.kodeKios}</TableCell>
                          <TableCell className="font-medium">{item.namaKios}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] ${getTypeBadgeColor(item.namaProduct)}`}>
                                {item.kodeProduct}
                              </Badge>
                              <span className="text-xs truncate max-w-[180px]">{item.namaProduct}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${stokBadgeClass}`}>
                              {item.stokKg} kg
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums">{item.syncnAt || '-'}</TableCell>
                          <TableCell className="text-center">
                            {item.added_at ? (
                              <Badge className="bg-blue-500 text-white text-[9px] px-1.5 py-0">Baru</Badge>
                            ) : item.updated_at ? (
                              <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">Updated</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Sync</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {((viewMode === 'card' && totalPages > 1) || (viewMode === 'table' && totalTablePages > 1)) && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  {viewMode === 'card' ? (
                    <>Menampilkan {(safePage - 1) * KIOS_PER_PAGE + 1} - {Math.min(safePage * KIOS_PER_PAGE, groupedKiosList.length)} dari {groupedKiosList.length} kios</>
                  ) : (
                    <>Menampilkan {(safePage - 1) * TABLE_PER_PAGE + 1} - {Math.min(safePage * TABLE_PER_PAGE, items.length)} dari {items.length} record</>
                  )}
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={safePage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-xs px-2 font-medium">Hal {safePage} dari {viewMode === 'card' ? totalPages : totalTablePages}</span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext onClick={() => setPage((p) => Math.min(viewMode === 'card' ? totalPages : totalTablePages, p + 1))} className={safePage >= (viewMode === 'card' ? totalPages : totalTablePages) ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StockView() {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formWarehouse, setFormWarehouse] = useState('')
  const [formProduct, setFormProduct] = useState('')
  const [formQty, setFormQty] = useState(0)
  const [formMinStock, setFormMinStock] = useState(500)
  const [isRestock, setIsRestock] = useState(false)
  const [editQty, setEditQty] = useState(0)
  const [editMinStock, setEditMinStock] = useState(500)
  const [page, setPage] = useState(1)
  const [restockOpen, setRestockOpen] = useState(false)
  const [restockItem, setRestockItem] = useState<StockWithProductAndWarehouse | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)

  const { data: stocks, isLoading } = useQuery({
    queryKey: ['stock', refreshKey],
    queryFn: fetchStock,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', refreshKey],
    queryFn: fetchWarehouses,
  })

  const { data: products } = useQuery({
    queryKey: ['products', refreshKey],
    queryFn: () => fetchProducts(),
  })

  const addMutation = useMutation({
    mutationFn: addStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      triggerRefresh()
      setDialogOpen(false)
      resetForm()
      toast({ title: 'Berhasil', description: 'Stok berhasil ditambahkan' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { quantity?: number; minStock?: number } }) => updateStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      triggerRefresh()
      setEditDialogOpen(false)
      toast({ title: 'Berhasil', description: 'Stok berhasil diperbarui' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      triggerRefresh()
      setDeleteOpen(false)
      setDeletingId(null)
      toast({ title: 'Berhasil', description: 'Stok berhasil dihapus' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const resetForm = () => {
    setFormWarehouse('')
    setFormProduct('')
    setFormQty(0)
    setFormMinStock(500)
    setIsRestock(false)
  }

  const handleOpenAdd = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleOpenEdit = (stock: StockWithProductAndWarehouse) => {
    setEditingId(stock.id)
    setEditQty(stock.quantity)
    setEditMinStock(stock.minStock)
    setEditDialogOpen(true)
  }

  const handleQuickRestock = (stock: StockWithProductAndWarehouse) => {
    setRestockItem(stock)
    setRestockOpen(true)
  }

  const handleSave = () => {
    if (!formWarehouse || !formProduct) {
      toast({ title: 'Validasi', description: 'Pilih gudang dan produk', variant: 'destructive' })
      return
    }
    if (formQty <= 0) {
      toast({ title: 'Validasi', description: 'Jumlah stok harus lebih dari 0', variant: 'destructive' })
      return
    }
    addMutation.mutate({
      warehouseId: formWarehouse,
      productId: formProduct,
      quantity: formQty,
      minStock: formMinStock,
    })
  }

  const handleEditSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: { quantity: editQty, minStock: editMinStock } })
    }
  }

  const handleDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId)
  }

  const allStocks = stocks || []
  const totalStockKg = allStocks.reduce((sum, s) => sum + s.quantity, 0)

  const filtered = allStocks.filter(
    (s) =>
      (warehouseFilter === 'all' || s.warehouseId === warehouseFilter) &&
      (s.product.name.toLowerCase().includes(search.toLowerCase()) ||
       s.warehouse.name.toLowerCase().includes(search.toLowerCase()))
  )

  const alertCount = allStocks.filter((s) => s.quantity / s.minStock <= 1).length

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(safePage * ITEMS_PER_PAGE, filtered.length)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Tabs defaultValue="pud" className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/70 p-1 border">
            <TabsTrigger value="pud" className="gap-2 px-4 py-2 text-xs sm:text-sm font-semibold">
              <WarehouseIcon className="h-4 w-4 text-emerald-600" />
              Stok PUD (Gudang Distributor)
            </TabsTrigger>
            <TabsTrigger value="ppts" className="gap-2 px-4 py-2 text-xs sm:text-sm font-semibold">
              <Store className="h-4 w-4 text-blue-600" />
              Stok PPTS (Kios iPubers)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pud" className="space-y-4 mt-0">
          <Card className="border-l-2 border-l-teal-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Boxes className="h-5 w-5" />
                  Manajemen Stok Gudang PUD
                  {alertCount > 0 && (
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px] gap-1 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800">
                      <AlertTriangle className="h-3 w-3" />
                      {alertCount} peringatan
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari stok..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                      className="pl-9 h-9 w-full sm:w-48"
                    />
                  </div>
                  <Button onClick={handleOpenAdd} size="sm" className="shrink-0 btn-gradient">
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Stok
                  </Button>
                  <Button onClick={() => setTransferOpen(true)} size="sm" variant="outline" className="shrink-0 border-primary/30 text-primary hover:bg-primary/10">
                    <ArrowLeftRight className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Transfer Stok</span>
                  </Button>
                </div>
              </div>
              {/* Total stock summary + warehouse filter pills */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="glass rounded-lg px-4 py-2.5 flex items-center gap-3 border border-border/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0 ring-1 ring-black/5 dark:ring-white/5">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Total Stok Semua Gudang PUD</p>
                    <p className="text-lg font-bold tabular-nums leading-tight">{formatNumber(totalStockKg)} <span className="text-xs font-normal text-muted-foreground">kg</span></p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => { setWarehouseFilter('all'); setPage(1) }}
                    className={`filter-pill ${warehouseFilter === 'all' ? 'active' : ''}`}
                  >
                    Semua
                  </button>
                  {(warehouses || []).map((w) => (
                    <button
                      key={w.id}
                      onClick={() => { setWarehouseFilter(w.id); setPage(1) }}
                      className={`filter-pill ${warehouseFilter === w.id ? 'active' : ''}`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-52 w-full rounded-lg" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Boxes className="h-12 w-12 opacity-30 mb-3" />
                  <p className="text-sm font-medium">
                    {warehouseFilter !== 'all' || search ? 'Tidak ada stok yang cocok' : 'Belum ada data stok'}
                  </p>
                  {(warehouseFilter !== 'all' || search) && (
                    <Button variant="ghost" size="sm" onClick={() => { setWarehouseFilter('all'); setSearch('') }} className="mt-2 text-xs">
                      Reset Filter
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paged.map((stock) => (
                      <StockCard
                        key={stock.id}
                        stock={stock}
                        onEdit={handleOpenEdit}
                        onDelete={(id) => { setDeletingId(id); setDeleteOpen(true) }}
                        onRestock={handleQuickRestock}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        Menampilkan {startIndex} - {endIndex} dari {filtered.length} stok
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={safePage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                          </PaginationItem>
                          <PaginationItem>
                            <span className="text-xs px-2 font-medium">Hal {safePage} dari {totalPages}</span>
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={safePage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ppts" className="space-y-4 mt-0">
          <StokPptsSection />
        </TabsContent>
      </Tabs>

      {/* Add Stock Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Stok Gudang PUD</DialogTitle>
            <DialogDescription>Tambahkan stok produk ke gudang distributor</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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
            <div className="grid gap-2">
              <Label>Produk *</Label>
              <Select value={formProduct} onValueChange={setFormProduct}>
                <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                <SelectContent>
                  {(products || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Jumlah (kg) *</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="restock" className="text-xs text-muted-foreground">Restock?</Label>
                  <Switch id="restock" checked={isRestock} onCheckedChange={setIsRestock} />
                </div>
              </div>
              <Input
                type="number"
                value={formQty || ''}
                onChange={(e) => setFormQty(parseFloat(e.target.value) || 0)}
                placeholder={isRestock ? 'Jumlah restock (kg)' : 'Jumlah stok awal (kg)'}
              />
            </div>
            <div className="grid gap-2">
              <Label>Stok Minimum (kg)</Label>
              <Input
                type="number"
                value={formMinStock || ''}
                onChange={(e) => setFormMinStock(parseFloat(e.target.value) || 500)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={addMutation.isPending} className="btn-gradient">
              {addMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stock Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Stok</DialogTitle>
            <DialogDescription>Perbarui jumlah stok</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Jumlah Stok (kg)</Label>
              <Input
                type="number"
                value={editQty || ''}
                onChange={(e) => setEditQty(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Stok Minimum (kg)</Label>
              <Input
                type="number"
                value={editMinStock || ''}
                onChange={(e) => setEditMinStock(parseFloat(e.target.value) || 500)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending} className="btn-gradient">
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Stok?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data stok meenghapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Restock Dialog */}
      {restockItem && (
        <QuickRestockDialog
          open={restockOpen}
          onOpenChange={setRestockOpen}
          stock={restockItem}
        />
      )}

      {/* Stock Transfer Dialog */}
      <StockTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </motion.div>
  )
}