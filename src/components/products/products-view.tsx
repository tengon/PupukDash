'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchProducts, createProduct, updateProduct, deleteProduct, type Product } from '@/lib/api'
import { formatRupiah, formatNumber, getTypeBadgeColor, getProductImage } from '@/lib/format'
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
import { Plus, Search, Pencil, Trash2, Package, CircleDot } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'

const PRODUCT_TYPES = ['UREA', 'NPK', 'SP-36', 'ZA', 'ORGANIK']

const TYPE_ICONS: Record<string, string> = {
  UREA: '🌱',
  NPK: '🧪',
  'SP-36': '💎',
  ZA: '⚡',
  ORGANIK: '🍃',
}

const TYPE_BORDER_COLORS: Record<string, string> = {
  UREA: 'border-l-emerald-500',
  NPK: 'border-l-teal-500',
  'SP-36': 'border-l-lime-500',
  ZA: 'border-l-green-500',
  ORGANIK: 'border-l-amber-500',
}

const TYPE_PILL_COLORS: Record<string, string> = {
  UREA: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  NPK: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
  'SP-36': 'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-700',
  ZA: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  ORGANIK: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
}

const emptyForm = {
  name: '',
  type: 'UREA',
  pricePerKg: 2250,
  subsidyPrice: 2250,
  pricePud: 1950,
  pricePpts: 2100,
  priceHet: 2250,
  description: '',
  isActive: true,
}

export function ProductsView() {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', refreshKey],
    queryFn: fetchProducts,
  })

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      triggerRefresh()
      setDialogOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      toast({ title: 'Berhasil', description: 'Produk berhasil ditambahkan' })
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      triggerRefresh()
      setDialogOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      toast({ title: 'Berhasil', description: 'Produk berhasil diperbarui' })
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      triggerRefresh()
      setDeleteOpen(false)
      setDeletingId(null)
      toast({ title: 'Berhasil', description: 'Produk berhasil dihapus' })
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    },
  })

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (product: Product) => {
    const isNpk = product.type === 'NPK'
    setForm({
      name: product.name,
      type: product.type,
      pricePerKg: product.pricePerKg || (isNpk ? 2300 : 2250),
      subsidyPrice: product.subsidyPrice || (isNpk ? 2300 : 2250),
      pricePud: product.pricePud || (isNpk ? 2050 : 1950),
      pricePpts: product.pricePpts || (isNpk ? 2150 : 2100),
      priceHet: product.priceHet || (isNpk ? 2300 : 2250),
      description: product.description || '',
      isActive: product.isActive,
    })
    setEditingId(product.id)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama produk wajib diisi', variant: 'destructive' })
      return
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form as Parameters<typeof createProduct>[0])
    }
  }

  const handleDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId)
  }

  const activeProducts = (products || []).filter(p => p.isActive)
  const filtered = activeProducts.filter(
    (p) =>
      (typeFilter === 'all' || p.type === typeFilter) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.type.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Card className="border-l-2 border-l-primary" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Daftar Produk Pupuk
              <Badge variant="secondary" className="text-[10px] ml-1 font-normal">
                <CircleDot className="h-3 w-3 mr-1" />
                {activeProducts.length} produk aktif
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-full sm:w-60"
                />
              </div>
              <Button onClick={handleOpenAdd} size="sm" className="shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <Plus className="h-4 w-4 mr-1" />
                Tambah Produk
              </Button>
            </div>
          </div>
          {/* Filter pills row */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {['all', ...PRODUCT_TYPES].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`filter-pill ${typeFilter === type ? 'active' : ''}`}
              >
                {type === 'all' ? 'Semua' : type}
              </button>
            ))}
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
                    <TableHead className="text-xs">Nama Produk</TableHead>
                    <TableHead className="text-xs">Tipe</TableHead>
                    <TableHead className="text-xs text-right cursor-help" title="Harga beli/bayar ke PI">Harga PUD (kg/Ton)</TableHead>
                    <TableHead className="text-xs text-right cursor-help" title="Harga Jual Ke PPTS">Harga PPTS (kg/Ton)</TableHead>
                    <TableHead className="text-xs text-right cursor-help" title="Harga Eceran Tertinggi PPTS ke Petani/Kelompok">Harga HET (kg/Ton)</TableHead>
                    <TableHead className="text-xs text-right">Stok Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        {search || typeFilter !== 'all' ? 'Tidak ada produk yang cocok' : 'Belum ada data produk'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((product) => {
                      const isNpk = product.type === 'NPK'
                      const pud = product.pricePud || (isNpk ? 2050 : 1950)
                      const ppts = product.pricePpts || (isNpk ? 2150 : 2100)
                      const het = product.priceHet || (isNpk ? 2300 : 2250)

                      return (
                        <TableRow key={product.id} className={`border-l-2 ${TYPE_BORDER_COLORS[product.type] || 'border-l-gray-300'} hover:border-l-primary/30`}>
                          <TableCell className="text-sm font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl border border-border bg-white dark:bg-zinc-900 p-1 flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105">
                                <img
                                  src={getProductImage(product.type, product.imageUrl)}
                                  alt={product.name}
                                  className="h-full w-full object-contain"
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm text-foreground">{product.name}</span>
                                {product.description && (
                                  <span className="text-[11px] text-muted-foreground line-clamp-1">{product.description}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${TYPE_PILL_COLORS[product.type] || getTypeBadgeColor(product.type)}`}>
                              {TYPE_ICONS[product.type] || ''} {product.type}
                            </Badge>
                          </TableCell>
                          {/* Harga PUD */}
                          <TableCell className="text-sm text-right font-mono">
                            <div>Rp {pud.toLocaleString('id-ID')}/kg</div>
                            <div className="text-[10px] text-muted-foreground">({formatRupiah(pud * 1000)}/Ton)</div>
                          </TableCell>
                          {/* Harga PPTS */}
                          <TableCell className="text-sm text-right font-mono">
                            <div>Rp {ppts.toLocaleString('id-ID')}/kg</div>
                            <div className="text-[10px] text-muted-foreground">({formatRupiah(ppts * 1000)}/Ton)</div>
                          </TableCell>
                          {/* Harga HET */}
                          <TableCell className="text-sm text-right font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                            <div>Rp {het.toLocaleString('id-ID')}/kg</div>
                            <div className="text-[10px] font-normal text-muted-foreground">({formatRupiah(het * 1000)}/Ton)</div>
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${(product.totalStock ?? 0) > 2000 ? 'bg-green-500' : (product.totalStock ?? 0) >= 500 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                <span className="font-mono">{formatNumber(Math.round(((product.totalStock ?? 0) / 1000) * 10) / 10)} Ton</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">({formatNumber(product.totalStock ?? 0)} kg)</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-[10px]">
                              {product.isActive ? 'Aktif' : 'Tidak Aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(product)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Produk</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDeletingId(product.id); setDeleteOpen(true) }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Hapus Produk</TooltipContent>
                              </Tooltip>
                            </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Produk Pupuk' : 'Tambah Produk Pupuk Baru'}</DialogTitle>
            <DialogDescription>
              Isi data dan daftar acuan harga resmi (PUD, PPTS, & HET) dalam Kg dan Ton.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Produk *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Pupuk Urea 50kg" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Tipe Pupuk</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => {
                    const isNpk = v === 'NPK'
                    setForm({
                      ...form,
                      type: v,
                      pricePud: isNpk ? 2050 : 1950,
                      pricePpts: isNpk ? 2150 : 2100,
                      priceHet: isNpk ? 2300 : 2250,
                    })
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 3 Price Fields Row (PUD, PPTS, HET) */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-3">
              <p className="text-xs font-bold text-foreground">Daftar Acuan Harga Resmi (Kg & Ton):</p>
              <div className="grid grid-cols-3 gap-2.5">
                {/* Harga PUD */}
                <div className="grid gap-1.5 bg-background p-2 rounded-lg border border-border/40">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="pricePud" title="Harga beli/bayar ke PI" className="text-[11px] font-semibold text-muted-foreground cursor-help underline decoration-dotted underline-offset-2 w-fit">
                        Harga PUD (Rp/kg)
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-medium">Harga beli/bayar ke PI</p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    id="pricePud"
                    type="number"
                    value={form.pricePud || ''}
                    onChange={(e) => setForm({ ...form, pricePud: parseFloat(e.target.value) || 0 })}
                    placeholder="Rp/kg"
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    = {formatRupiah((form.pricePud || 0) * 1000)}/Ton
                  </span>
                </div>

                {/* Harga PPTS */}
                <div className="grid gap-1.5 bg-background p-2 rounded-lg border border-border/40">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="pricePpts" title="Harga Jual Ke PPTS" className="text-[11px] font-semibold text-muted-foreground cursor-help underline decoration-dotted underline-offset-2 w-fit">
                        Harga PPTS (Rp/kg)
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-medium">Harga Jual Ke PPTS</p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    id="pricePpts"
                    type="number"
                    value={form.pricePpts || ''}
                    onChange={(e) => setForm({ ...form, pricePpts: parseFloat(e.target.value) || 0 })}
                    placeholder="Rp/kg"
                    className="h-8 text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    = {formatRupiah((form.pricePpts || 0) * 1000)}/Ton
                  </span>
                </div>

                {/* Harga HET */}
                <div className="grid gap-1.5 bg-emerald-50/60 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-300 dark:border-emerald-700">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="priceHet" title="Harga Eceran Tertinggi PPTS ke Petani/Kelompok" className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 cursor-help underline decoration-dotted underline-offset-2 w-fit">
                        Harga HET (Rp/kg)
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px]">
                      <p className="text-xs font-medium">Harga Eceran Tertinggi PPTS ke Petani/Kelompok</p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    id="priceHet"
                    type="number"
                    value={form.priceHet || ''}
                    onChange={(e) => setForm({ ...form, priceHet: parseFloat(e.target.value) || 0, pricePerKg: parseFloat(e.target.value) || 0, subsidyPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="Rp/kg"
                    className="h-8 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300"
                  />
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                    = {formatRupiah((form.priceHet || 0) * 1000)}/Ton
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">Deskripsi Produk</Label>
              <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat produk pupuk ini, misalnya kegunaan dan komposisi" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="btn-gradient">
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Produk akan dihapus permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}