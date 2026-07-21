'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  fetchStock, addStock, updateStock, deleteStock,
  fetchWarehouses, fetchProducts,
  type StockWithProductAndWarehouse, type Warehouse, type Product,
} from '@/lib/api'
import { formatNumber, formatDateTime, getStockStatusColor, getStockStatusLabel } from '@/lib/format'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Boxes, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'

export function StockView() {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
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

  const filtered = (stocks || []).filter(
    (s) => warehouseFilter === 'all' || s.warehouseId === warehouseFilter
  )

  const alertCount = (stocks || []).filter((s) => s.quantity / s.minStock <= 1).length

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              Manajemen Stok
              {alertCount > 0 && (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {alertCount} peringatan
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="h-9 w-full sm:w-48">
                  <SelectValue placeholder="Filter Gudang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Gudang</SelectItem>
                  {(warehouses || []).map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleOpenAdd} size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Tambah Stok
              </Button>
            </div>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Gudang</TableHead>
                    <TableHead className="text-xs">Produk</TableHead>
                    <TableHead className="text-xs text-right">Stok (kg)</TableHead>
                    <TableHead className="text-xs text-right">Stok Min.</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Terakhir Restock</TableHead>
                    <TableHead className="text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        {warehouseFilter !== 'all' ? 'Tidak ada stok untuk gudang ini' : 'Belum ada data stok'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((stock, idx) => (
                      <TableRow key={stock.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                        <TableCell className="text-sm">{stock.warehouse.name}</TableCell>
                        <TableCell className="text-sm font-medium">{stock.product.name}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{formatNumber(stock.quantity)}</TableCell>
                        <TableCell className="text-sm text-right text-muted-foreground font-mono">{formatNumber(stock.minStock)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStockStatusColor(stock.quantity, stock.minStock)}`}>
                            {getStockStatusLabel(stock.quantity, stock.minStock)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell text-muted-foreground">
                          {stock.lastRestocked ? formatDateTime(stock.lastRestocked) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(stock)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDeletingId(stock.id); setDeleteOpen(true) }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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
            <Button onClick={handleSave} disabled={addMutation.isPending}>
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
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
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
    </motion.div>
  )
}