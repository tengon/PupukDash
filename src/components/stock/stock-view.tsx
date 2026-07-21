'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  fetchStock, addStock, updateStock, deleteStock,
  fetchWarehouses, fetchProducts,
  type StockWithProductAndWarehouse,
} from '@/lib/api'
import { formatNumber, getTypeBadgeColor } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Boxes, AlertTriangle, Search, Package, Warehouse as WarehouseIcon, Layers, PackagePlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import { QuickRestockDialog } from './quick-restock-dialog'

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

  return (
    <Card className={`border-l-3 ${statusBg} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out`} style={{ boxShadow: 'var(--shadow-sm)' }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0 ring-1 ring-black/5 dark:ring-white/5">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{stock.product.name}</p>
              <div className="flex items-center gap-1.5">
                <WarehouseIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground truncate">{stock.warehouse.name}</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 font-semibold ${getTypeBadgeColor(stock.product.type)}`}>
            {stock.product.type}
          </Badge>
        </div>

        <div className="mb-1">
          <p className={`text-3xl font-bold tabular-nums ${statusColor}`}>{formatNumber(stock.quantity)}</p>
          <p className="text-xs text-muted-foreground">kilogram</p>
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
            <Button variant="outline" size="icon" className="h-7 w-7 text-primary border-primary/30 hover:bg-primary/10" onClick={() => onRestock(stock)} title="Restok Cepat">
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
      <Card className="border-l-2 border-l-teal-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              Manajemen Stok
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
            </div>
          </div>
          {/* Total stock summary + warehouse filter pills */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="glass rounded-lg px-4 py-2.5 flex items-center gap-3 border border-border/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0 ring-1 ring-black/5 dark:ring-white/5">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Total Stok Semua Gudang</p>
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
                <p className="text-xs mt-1">Coba ubah filter atau kata kunci pencarian</p>
              )}
            </div>
          ) : (
            <>
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
              {filtered.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
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

      {/* Add Stock Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Stok</DialogTitle>
            <DialogDescription>Tambahkan stok produk ke gudang</DialogDescription>
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
              Tindakan ini tidak dapat dibatalkan. Data stok akan dihapus permanen.
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
    </motion.div>
  )
}