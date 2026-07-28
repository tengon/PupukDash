'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchPurchases, createPurchase, fetchWarehouses, fetchProducts, type Purchase } from '@/lib/api'
import { formatRupiah, formatNumber, formatDateTime, getProductImage, getTypeBadgeColor } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { motion } from 'framer-motion'
import { Plus, Search, ShoppingBag, Building2, Warehouse, Package, Truck, Calendar, Banknote } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const DEFAULT_SUPPLIERS = [
  'PT Pupuk Indonesia (Persero)',
  'PT Petrokimia Gresik',
  'PT Pupuk Kujang Cikampek',
  'PT Pupuk Sriwidjaja Palembang',
  'PT Pupuk Kalimantan Timur',
]

export function PurchasesView() {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  const [supplierName, setSupplierName] = useState(DEFAULT_SUPPLIERS[0])
  const [formWarehouse, setFormWarehouse] = useState('')
  const [formProduct, setFormProduct] = useState('')
  const [formQuantityTon, setFormQuantityTon] = useState<number>(10)
  const [formPricePerKg, setFormPricePerKg] = useState(2000)
  const [formNotes, setFormNotes] = useState('')

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases', refreshKey, search, warehouseFilter],
    queryFn: () => fetchPurchases({ search, warehouseId: warehouseFilter }),
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
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      triggerRefresh()
      setDialogOpen(false)
      setFormNotes('')
      toast({ title: 'Berhasil', description: 'Pembelian supplier berhasil dicatat & stok otomatis bertambah' })
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    },
  })

  const handleOpenAdd = () => {
    if (warehouses && warehouses.length > 0) setFormWarehouse(warehouses[0].id)
    if (products && products.length > 0) {
      setFormProduct(products[0].id)
      setFormPricePerKg(products[0].subsidyPrice || products[0].pricePerKg)
    }
    setDialogOpen(true)
  }

  const handleProductChange = (productId: string) => {
    setFormProduct(productId)
    const p = (products || []).find((item) => item.id === productId)
    if (p) setFormPricePerKg(p.subsidyPrice || p.pricePerKg)
  }

  const handleSave = () => {
    if (!formWarehouse || !formProduct || !formQuantityTon || formQuantityTon <= 0) {
      toast({ title: 'Validasi', description: 'Gudang, produk, dan jumlah wajib diisi', variant: 'destructive' })
      return
    }

    createMutation.mutate({
      supplierName,
      warehouseId: formWarehouse,
      productId: formProduct,
      quantity: formQuantityTon * 1000,
      pricePerKg: formPricePerKg,
      notes: formNotes || undefined,
    })
  }

  const list = purchases || []
  const totalAmount = list.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalKg = list.reduce((sum, p) => sum + p.quantity, 0)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Nilai Pembelian</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300 font-mono mt-0.5">{formatRupiah(totalAmount)}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Banknote className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Volume Pupuk Masuk</p>
              <p className="text-xl font-bold text-teal-700 dark:text-teal-300 font-mono mt-0.5">
                {(totalKg / 1000).toLocaleString('id-ID', { maximumFractionDigits: 3 })} Ton ({formatNumber(totalKg)} kg)
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Produsen Utama</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 truncate max-w-[180px]">PT Pupuk Indonesia</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="border-l-2 border-l-primary" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Pembelian Pupuk dari Supplier (Produsen)
                <Badge variant="secondary" className="text-[10px] ml-1 font-normal">
                  {list.length} Transaksi
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Pencatatan pasokan pupuk masuk ke gudang dari PT Pupuk Indonesia / Produsen
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari PO / Supplier / Produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-full sm:w-60"
                />
              </div>
              <Button onClick={handleOpenAdd} size="sm" className="shrink-0 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-sm hover:shadow transition-all">
                <Plus className="h-4 w-4 mr-1" />
                Catat Pembelian
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
                    <TableHead className="text-xs">No PO</TableHead>
                    <TableHead className="text-xs">Supplier / Produsen</TableHead>
                    <TableHead className="text-xs">Gudang Tujuan</TableHead>
                    <TableHead className="text-xs">Produk Pupuk</TableHead>
                    <TableHead className="text-xs text-right">Jumlah Masuk</TableHead>
                    <TableHead className="text-xs text-right">Harga/kg</TableHead>
                    <TableHead className="text-xs text-right">Total Nilai</TableHead>
                    <TableHead className="text-xs">Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                        {search ? 'Tidak ada data pembelian yang cocok' : 'Belum ada transaksi pembelian supplier'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((item) => (
                      <TableRow key={item.id} className="hover:border-l-2 hover:border-l-blue-500 transition-colors">
                        <TableCell className="text-xs font-mono font-medium">
                          <Badge variant="outline" className="font-mono text-[11px] bg-blue-50/50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                            {item.purchaseNo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{item.supplierName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Warehouse className="h-3 w-3 shrink-0 text-emerald-600" />
                            <span>{item.warehouse?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded border border-border bg-white dark:bg-zinc-900 p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                              <img
                                src={getProductImage(item.product?.name, item.product?.imageUrl)}
                                alt={item.product?.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <span>{item.product?.name}</span>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${getTypeBadgeColor(item.product?.type || '')}`}>
                              {item.product?.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{(item.quantity / 1000).toLocaleString('id-ID', { maximumFractionDigits: 3 })} Ton ({formatNumber(item.quantity)} kg)
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatRupiah(item.pricePerKg)}</TableCell>
                        <TableCell className="text-sm text-right font-mono font-bold text-blue-700 dark:text-blue-300">
                          {formatRupiah(item.totalAmount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.createdAt)}
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

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pembelian dari Supplier</DialogTitle>
            <DialogDescription>
              Isi data pasokan pupuk masuk. Stok gudang akan otomatis ter-update secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Supplier / Produsen *</Label>
              <select
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DEFAULT_SUPPLIERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Gudang Tujuan *</Label>
                <select
                  value={formWarehouse}
                  onChange={(e) => setFormWarehouse(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {(warehouses || []).map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Produk Pupuk *</Label>
                <select
                  value={formProduct}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {(products || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Jumlah Masuk (Ton) *</Label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  placeholder="Jumlah dalam Ton (misal: 10)"
                  value={formQuantityTon || ''}
                  onChange={(e) => setFormQuantityTon(parseFloat(e.target.value) || 0)}
                  className="h-9 text-xs font-mono"
                />
                {formQuantityTon > 0 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    = {formatNumber(formQuantityTon * 1000)} kg
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Harga Beli / kg (Rp) *</Label>
                <Input
                  type="number"
                  placeholder="Harga per kg"
                  value={formPricePerKg || ''}
                  onChange={(e) => setFormPricePerKg(parseFloat(e.target.value) || 0)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Total calculation preview */}
            <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex justify-between items-center text-xs">
              <span className="font-medium text-blue-800 dark:text-blue-300">Total Nilai Pembelian ({formatNumber(formQuantityTon)} Ton):</span>
              <span className="font-bold text-sm font-mono text-blue-700 dark:text-blue-200">
                {formatRupiah(formQuantityTon * 1000 * formPricePerKg)}
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Catatan Tambahan</Label>
              <Textarea
                placeholder="No Surat Jalan / Catatan ekspedisi..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan & Tambah Stok'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
