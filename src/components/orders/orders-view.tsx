'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  fetchOrders, fetchFarmers, fetchWarehouses, fetchProducts,
  createOrder, updateOrder,
  type OrderWithDetails, type Farmer, type Warehouse, type Product,
} from '@/lib/api'
import { formatRupiah, formatNumber, formatDate, getStatusColor, getStatusLabel, getTypeBadgeColor } from '@/lib/format'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { Plus, Search, ShoppingCart, Eye, ArrowRight, Minus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

interface OrderItemForm {
  productId: string
  productName: string
  quantity: number
  pricePerKg: number
  subsidyPrice: number
  subtotal: number
  subsidySubtotal: number
}

export function OrdersView() {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [detailOrder, setDetailOrder] = useState<OrderWithDetails | null>(null)
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null)

  const [formFarmer, setFormFarmer] = useState('')
  const [formWarehouse, setFormWarehouse] = useState('')
  const [formItems, setFormItems] = useState<OrderItemForm[]>([])
  const [formNotes, setFormNotes] = useState('')
  const [farmerSearch, setFarmerSearch] = useState('')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', refreshKey],
    queryFn: fetchOrders,
  })

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
    setFormFarmer('')
    setFormWarehouse('')
    setFormItems([])
    setFormNotes('')
    setFarmerSearch('')
  }

  const addItem = () => {
    setFormItems([...formItems, {
      productId: '',
      productName: '',
      quantity: 0,
      pricePerKg: 0,
      subsidyPrice: 0,
      subtotal: 0,
      subsidySubtotal: 0,
    }])
  }

  const removeItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof OrderItemForm, value: string | number) => {
    const updated = [...formItems]
    ;(updated[index] as Record<string, string | number>)[field] = value

    if (field === 'productId' && typeof value === 'string') {
      const product = (products || []).find((p) => p.id === value)
      if (product) {
        updated[index].productName = product.name
        updated[index].pricePerKg = product.pricePerKg
        updated[index].subsidyPrice = product.subsidyPrice
      }
    }

    updated[index].subtotal = updated[index].quantity * updated[index].pricePerKg
    updated[index].subsidySubtotal = updated[index].quantity * updated[index].subsidyPrice

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

  const filtered = (orders || []).filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const matchSearch = !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.farmer.name.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Penjualan / Pesanan
            </CardTitle>
            <Button onClick={() => { resetCreateForm(); setCreateOpen(true) }} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              Buat Pesanan
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="h-8">
                {ORDER_STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pesanan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
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
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        Tidak ada data pesanan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((order, idx) => (
                      <TableRow key={order.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                        <TableCell className="text-xs font-mono">{order.orderNumber}</TableCell>
                        <TableCell className="text-sm font-medium">{order.farmer.name}</TableCell>
                        <TableCell className="text-xs hidden md:table-cell">{order.warehouse.name}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatRupiah(order.totalAmount)}</TableCell>
                        <TableCell className="text-xs text-right hidden sm:table-cell text-primary">{formatRupiah(order.totalSubsidy)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </Badge>
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
          )}
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                    {formItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                        <div className="col-span-12 sm:col-span-5">
                          <Label className="text-[10px] text-muted-foreground">Produk</Label>
                          <Select value={item.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>
                              {(products || []).filter(p => p.isActive).map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Label className="text-[10px] text-muted-foreground">Qty (kg)</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          />
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
                        <div className="col-span-2 sm:col-span-1 flex justify-end">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {formItems.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Harga Normal</span>
                  <span className="font-medium">{formatRupiah(totals.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Harga Subsidi</span>
                  <span className="font-bold text-primary">{formatRupiah(totals.totalSubsidy)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Selisih Subsidi</span>
                  <span className="font-bold text-green-600">{formatRupiah(totals.totalAmount - totals.totalSubsidy)}</span>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Catatan</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Catatan tambahan..." rows={2} />
            </div>
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
        <DialogContent className="sm:max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detail Pesanan</DialogTitle>
            <DialogDescription>
              {detailOrder && <span className="font-mono">{detailOrder.orderNumber}</span>}
            </DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
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
                        <TableCell className="text-xs">
                          {item.productName}
                          <Badge variant="outline" className={`ml-1 text-[9px] px-1 py-0 ${getTypeBadgeColor(item.product?.type || '')}`}>
                            {item.product?.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatNumber(item.quantity)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatRupiah(item.pricePerKg)}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-medium">{formatRupiah(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Separator />
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
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
