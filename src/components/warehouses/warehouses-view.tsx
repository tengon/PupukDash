'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, fetchWarehouseStock, type Warehouse, type WarehouseStockDetail } from '@/lib/api'
import { formatNumber, getStockStatusColor, getStockStatusLabel, getTypeBadgeColor } from '@/lib/format'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Plus, Search, Pencil, Trash2, Warehouse as WarehouseIcon, Package, AlertTriangle, Phone, MapPin, Map } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

import { fetchProvinces, fetchRegencies, fetchDistricts } from '@/lib/wilayah'

const ITEMS_PER_PAGE = 10

const emptyForm = {
  code: '',
  name: '',
  address: '',
  district: '',
  regency: '',
  province: '',
  managerName: '',
  managerPhone: '',
  isActive: true,
}

export function WarehousesView({ hideAddButton = false }: { hideAddButton?: boolean }) {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [stockDetailOpen, setStockDetailOpen] = useState(false)
  const [stockDetailId, setStockDetailId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses', refreshKey],
    queryFn: fetchWarehouses,
  })

  // Wilayah API Queries
  const { data: provinces } = useQuery({
    queryKey: ['provinces'],
    queryFn: fetchProvinces,
  })

  const selectedProvinceId = provinces?.find(p => p.name.toUpperCase() === form.province.toUpperCase())?.id || ''
  
  const { data: regencies } = useQuery({
    queryKey: ['regencies', selectedProvinceId],
    queryFn: () => fetchRegencies(selectedProvinceId),
    enabled: !!selectedProvinceId,
  })

  const selectedRegencyId = regencies?.find(r => r.name.toUpperCase() === form.regency.toUpperCase())?.id || ''

  const { data: districts } = useQuery({
    queryKey: ['districts', selectedRegencyId],
    queryFn: () => fetchDistricts(selectedRegencyId),
    enabled: !!selectedRegencyId,
  })

  const { data: stockDetail, isLoading: stockDetailLoading } = useQuery({
    queryKey: ['warehouse-stock', stockDetailId],
    queryFn: () => fetchWarehouseStock(stockDetailId!),
    enabled: !!stockDetailId,
  })

  const createMutation = useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      triggerRefresh()
      setDialogOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      toast({ title: 'Berhasil', description: 'Gudang berhasil ditambahkan' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Warehouse> }) => updateWarehouse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      triggerRefresh()
      setDialogOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      toast({ title: 'Berhasil', description: 'Gudang berhasil diperbarui' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      triggerRefresh()
      setDeleteOpen(false)
      setDeletingId(null)
      toast({ title: 'Berhasil', description: 'Gudang berhasil dihapus' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (wh: Warehouse) => {
    setForm({
      code: wh.code,
      name: wh.name,
      address: wh.address,
      district: wh.district || '',
      regency: wh.regency || '',
      province: wh.province || '',
      managerName: wh.managerName || '',
      managerPhone: wh.managerPhone || '',
      isActive: wh.isActive,
    })
    setEditingId(wh.id)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast({ title: 'Validasi', description: 'Kode dan nama gudang wajib diisi', variant: 'destructive' })
      return
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form as Parameters<typeof createWarehouse>[0])
    }
  }

  const handleDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId)
  }

  const handleOpenStockDetail = (wh: Warehouse) => {
    setStockDetailId(wh.id)
    setStockDetailOpen(true)
  }

  const filtered = (warehouses || []).filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.code.toLowerCase().includes(search.toLowerCase()) ||
      w.regency?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(safePage * ITEMS_PER_PAGE, filtered.length)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* Summary Stats Cards */}
      {!isLoading && warehouses && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-r from-emerald-50/60 to-white dark:from-emerald-900/10 dark:to-card p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <WarehouseIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Total Gudang Aktif</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{warehouses.filter(w => w.isActive).length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-gradient-to-r from-blue-50/60 to-white dark:from-blue-900/10 dark:to-card p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Total Stok</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatNumber(warehouses.reduce((s, w) => s + (w.totalStock ?? 0), 0))} <span className="text-xs font-normal text-muted-foreground">kg</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-r from-amber-50/60 to-white dark:from-amber-900/10 dark:to-card p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Map className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Kabupaten</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{new Set(warehouses.map(w => w.regency).filter(Boolean)).size}</p>
            </div>
          </div>
        </div>
      )}
      <Card className="border-l-4 border-emerald-500">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <WarehouseIcon className="h-5 w-5" />
              Data Gudang
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari gudang..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 h-9 w-full sm:w-60"
                />
              </div>
              {!hideAddButton && (
                <Button onClick={handleOpenAdd} size="sm" className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Gudang
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Kode</TableHead>
                      <TableHead className="text-xs">Nama Gudang</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Alamat</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Kabupaten</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Provinsi</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Pengelola</TableHead>
                      <TableHead className="text-xs text-right">Stok</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <WarehouseIcon className="h-10 w-10 opacity-30" />
                            <p className="text-sm font-medium">
                              {search ? 'Tidak ada gudang yang cocok' : 'Belum ada data gudang'}
                            </p>
                            {search && (
                              <p className="text-xs">Coba ubah kata kunci pencarian</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((wh) => (
                        <TableRow key={wh.id} className="cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20" onClick={() => handleOpenStockDetail(wh)}>
                          <TableCell className="text-xs font-mono font-medium">{wh.code}</TableCell>
                          <TableCell className="text-sm font-medium">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{wh.name}</span>
                              {(wh.orderCount ?? 0) > 0 && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-semibold">{wh.orderCount} pesanan</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs hidden md:table-cell max-w-[200px] truncate">{wh.address}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              {wh.regency || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{wh.province}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{wh.managerName || '-'}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatNumber(wh.totalStock ?? 0)} kg</TableCell>
                          <TableCell>
                            <Badge variant={wh.isActive ? 'default' : 'secondary'} className="text-[10px]">
                              {wh.isActive ? 'Aktif' : 'Tidak Aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenEdit(wh) }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingId(wh.id); setDeleteOpen(true) }}>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Gudang' : 'Tambah Gudang Baru'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Perbarui informasi gudang' : 'Isi data gudang baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="code">Kode Gudang *</Label>
                <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="GDG-001" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wname">Nama Gudang *</Label>
                <Input id="wname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gudang Pupuk Indramayu" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="waddress">Alamat *</Label>
              <Input id="waddress" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap gudang" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="wprovince">Provinsi *</Label>
                <select
                  id="wprovince"
                  value={form.province}
                  onChange={(e) => {
                    setForm({ ...form, province: e.target.value, regency: '', district: '' })
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Pilih Provinsi</option>
                  {provinces?.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wregency">Kabupaten / Kota</Label>
                <select
                  id="wregency"
                  value={form.regency}
                  onChange={(e) => {
                    setForm({ ...form, regency: e.target.value, district: '' })
                  }}
                  disabled={!form.province}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">Pilih Kabupaten/Kota</option>
                  {regencies?.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wdistrict">Kecamatan</Label>
              <select
                id="wdistrict"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                disabled={!form.regency}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">Pilih Kecamatan</option>
                {districts?.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="mname">Nama Pengelola</Label>
                <Input id="mname" value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} placeholder="Nama pengelola" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mphone">No. HP Pengelola</Label>
                <Input id="mphone" value={form.managerPhone} onChange={(e) => setForm({ ...form, managerPhone: e.target.value })} placeholder="08xxxxxxxxxx" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Detail Dialog */}
      <Dialog open={stockDetailOpen} onOpenChange={(open) => { setStockDetailOpen(open); if (!open) setStockDetailId(null) }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {stockDetailLoading ? (
            <div className="py-8 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : stockDetail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <WarehouseIcon className="h-5 w-5 text-amber-500" />
                  Detail Stok Gudang
                </DialogTitle>
                <DialogDescription>Informasi stok untuk gudang tertentu</DialogDescription>
              </DialogHeader>
              {/* Warehouse Info Header */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded">{stockDetail.warehouse.code}</span>
                  <span className="font-semibold text-sm">{stockDetail.warehouse.name}</span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{stockDetail.warehouse.address}{stockDetail.warehouse.regency ? `, ${stockDetail.warehouse.regency}` : ''}{stockDetail.warehouse.province ? ` — ${stockDetail.warehouse.province}` : ''}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {stockDetail.warehouse.managerName && (
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      <span>{stockDetail.warehouse.managerName}</span>
                    </div>
                  )}
                  {stockDetail.warehouse.managerPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{stockDetail.warehouse.managerPhone}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Stok</p>
                  <p className="text-base font-bold mt-0.5">{formatNumber(stockDetail.summary.totalStock)} kg</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Jumlah Produk</p>
                  <p className="text-base font-bold mt-0.5">{stockDetail.summary.totalProducts}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                    <AlertTriangle className={`h-3 w-3 ${stockDetail.summary.lowStockCount > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
                    Stok Rendah
                  </p>
                  <p className={`text-base font-bold mt-0.5 ${stockDetail.summary.lowStockCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>{stockDetail.summary.lowStockCount}</p>
                </div>
              </div>
              {/* Stock Entries Table */}
              {stockDetail.stockEntries.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Belum ada data stok untuk gudang ini</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Produk</TableHead>
                        <TableHead className="text-xs">Jenis</TableHead>
                        <TableHead className="text-xs text-right">Jumlah (kg)</TableHead>
                        <TableHead className="text-xs text-right">Min. Stok</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockDetail.stockEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs font-medium">{entry.productName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getTypeBadgeColor(entry.productType)}`}>
                              {entry.productType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">{formatNumber(entry.quantity)}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">{formatNumber(entry.minStock)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStockStatusColor(entry.quantity, entry.minStock)}`}>
                              {getStockStatusLabel(entry.quantity, entry.minStock)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Gudang?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Gudang akan dihapus permanen dari sistem.
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