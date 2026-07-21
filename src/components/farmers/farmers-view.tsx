'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchFarmers, createFarmer, updateFarmer, deleteFarmer, fetchOrders, type Farmer, type OrderWithDetails } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/format'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { Plus, Search, Pencil, Trash2, Users, Eye, Download, UserCheck, Wheat } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import { useToast } from '@/hooks/use-toast'
import { formatRupiah, getStatusColor, getStatusLabel } from '@/lib/format'

const ITEMS_PER_PAGE = 10

const emptyForm = {
  nik: '',
  name: '',
  phone: '',
  address: '',
  village: '',
  district: '',
  regency: '',
  province: '',
  landAreaHa: 0,
  farmerGroup: '',
  isActive: true,
}

export function FarmersView() {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [detailFarmer, setDetailFarmer] = useState<Farmer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [nikError, setNikError] = useState('')
  const [page, setPage] = useState(1)

  const { data: farmers, isLoading } = useQuery({
    queryKey: ['farmers', refreshKey],
    queryFn: fetchFarmers,
  })

  const { data: orders } = useQuery({
    queryKey: ['orders', refreshKey],
    queryFn: fetchOrders,
    enabled: detailOpen && !!detailFarmer,
  })

  const createMutation = useMutation({
    mutationFn: createFarmer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] })
      triggerRefresh()
      setDialogOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      toast({ title: 'Berhasil', description: 'Petani berhasil ditambahkan' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Farmer> }) => updateFarmer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] })
      triggerRefresh()
      setDialogOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      toast({ title: 'Berhasil', description: 'Data petani berhasil diperbarui' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFarmer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] })
      triggerRefresh()
      setDeleteOpen(false)
      setDeletingId(null)
      toast({ title: 'Berhasil', description: 'Petani berhasil dihapus' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const validateNik = (nik: string) => {
    if (!/^\d{16}$/.test(nik)) {
      setNikError('NIK harus 16 digit angka')
      return false
    }
    setNikError('')
    return true
  }

  const handleOpenAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setNikError('')
    setDialogOpen(true)
  }

  const handleOpenEdit = (farmer: Farmer) => {
    setForm({
      nik: farmer.nik,
      name: farmer.name,
      phone: farmer.phone || '',
      address: farmer.address || '',
      village: farmer.village || '',
      district: farmer.district || '',
      regency: farmer.regency || '',
      province: farmer.province || '',
      landAreaHa: farmer.landAreaHa || 0,
      farmerGroup: farmer.farmerGroup || '',
      isActive: farmer.isActive,
    })
    setEditingId(farmer.id)
    setNikError('')
    setDialogOpen(true)
  }

  const handleOpenDetail = (farmer: Farmer) => {
    setDetailFarmer(farmer)
    setDetailOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama wajib diisi', variant: 'destructive' })
      return
    }
    if (!validateNik(form.nik)) {
      toast({ title: 'Validasi', description: 'NIK harus 16 digit angka', variant: 'destructive' })
      return
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form as Parameters<typeof createFarmer>[0])
    }
  }

  const handleDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId)
  }

  const filtered = (farmers || []).filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.nik.includes(search) ||
      (f.farmerGroup || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.regency || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(safePage * ITEMS_PER_PAGE, filtered.length)

  const farmerOrders = (orders || []).filter((o) => o.farmerId === detailFarmer?.id)

  // Summary stats
  const activeFarmers = (farmers || []).filter((f) => f.isActive).length
  const allFarmers = farmers || []
  const avgLandArea = allFarmers.length > 0
    ? allFarmers.reduce((sum, f) => sum + (f.landAreaHa || 0), 0) / allFarmers.length
    : 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* Summary Cards */}
      {!isLoading && farmers && farmers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-l-2 border-l-emerald-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatNumber(activeFarmers)}</p>
                <p className="text-xs text-muted-foreground">Total Petani Aktif</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-2 border-l-teal-500">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
                <Wheat className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgLandArea.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Rata-rata Luas Lahan (Ha)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-l-2 border-l-emerald-500">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Data Petani
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari petani..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 h-9 w-full sm:w-60"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={!farmers || farmers.length === 0}
                onClick={() => {
                  exportToCSV(
                    'data-petani',
                    ['NIK', 'Nama', 'Telepon', 'Alamat', 'Desa', 'Kecamatan', 'Kabupaten', 'Provinsi', 'Luas Lahan (Ha)', 'Kelompok Tani', 'Status'],
                    (farmers || []).map((f) => [
                      f.nik,
                      f.name,
                      f.phone || '',
                      f.address || '',
                      f.village || '',
                      f.district || '',
                      f.regency || '',
                      f.province || '',
                      f.landAreaHa || '',
                      f.farmerGroup || '',
                      f.isActive ? 'Aktif' : 'Tidak Aktif',
                    ]),
                  )
                }}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button onClick={handleOpenAdd} size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Tambah Petani
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
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">NIK</TableHead>
                      <TableHead className="text-xs">Nama</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Telepon</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Kelompok Tani</TableHead>
                      <TableHead className="text-xs hidden xl:table-cell">Kabupaten</TableHead>
                      <TableHead className="text-xs text-right hidden sm:table-cell">Luas Lahan (Ha)</TableHead>
                      <TableHead className="text-xs text-right">Pesanan</TableHead>
                      <TableHead className="text-xs text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Users className="h-10 w-10 opacity-30" />
                            <p className="text-sm font-medium">
                              {search ? 'Tidak ada petani yang cocok' : 'Belum ada data petani'}
                            </p>
                            {search && (
                              <p className="text-xs">Coba ubah kata kunci pencarian</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((farmer) => (
                        <TableRow key={farmer.id}>
                          <TableCell className="text-xs font-mono">{farmer.nik}</TableCell>
                          <TableCell className="text-sm font-medium">{farmer.name}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell">{farmer.phone || '-'}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{farmer.farmerGroup || '-'}</TableCell>
                          <TableCell className="text-xs hidden xl:table-cell">{farmer.regency || '-'}</TableCell>
                          <TableCell className="text-xs text-right hidden sm:table-cell font-mono">{farmer.landAreaHa ? formatNumber(farmer.landAreaHa) : '-'}</TableCell>
                          <TableCell className="text-xs text-right">{farmer._count?.orders || 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDetail(farmer)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(farmer)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDeletingId(farmer.id); setDeleteOpen(true) }}>
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
            <DialogTitle>{editingId ? 'Edit Data Petani' : 'Tambah Petani Baru'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Perbarui informasi petani' : 'Isi data petani baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="nik">NIK *</Label>
                <Input
                  id="nik"
                  value={form.nik}
                  onChange={(e) => { setForm({ ...form, nik: e.target.value.replace(/\D/g, '').slice(0, 16) }); if (nikError) validateNik(e.target.value.replace(/\D/g, '').slice(0, 16)) }}
                  placeholder="16 digit NIK"
                  maxLength={16}
                />
                {nikError && <p className="text-xs text-destructive">{nikError}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fname">Nama Lengkap *</Label>
                <Input id="fname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="phone">No. HP</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="landArea">Luas Lahan (Ha)</Label>
                <Input id="landArea" type="number" value={form.landAreaHa || ''} onChange={(e) => setForm({ ...form, landAreaHa: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="farmerGroup">Kelompok Tani</Label>
                <Input id="farmerGroup" value={form.farmerGroup} onChange={(e) => setForm({ ...form, farmerGroup: e.target.value })} placeholder="Nama kelompok tani" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="village">Desa</Label>
                <Input id="village" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="district">Kecamatan</Label>
                <Input id="district" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="regency">Kabupaten</Label>
                <Input id="regency" value={form.regency} onChange={(e) => setForm({ ...form, regency: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Alamat</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="province">Provinsi</Label>
              <Input id="province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detail Petani</DialogTitle>
          </DialogHeader>
          {detailFarmer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">NIK:</span> <span className="font-mono">{detailFarmer.nik}</span></div>
                <div><span className="text-muted-foreground">Nama:</span> <span className="font-medium">{detailFarmer.name}</span></div>
                <div><span className="text-muted-foreground">No. HP:</span> {detailFarmer.phone || '-'}</div>
                <div><span className="text-muted-foreground">Luas Lahan:</span> {detailFarmer.landAreaHa ? `${formatNumber(detailFarmer.landAreaHa)} Ha` : '-'}</div>
                <div><span className="text-muted-foreground">Kel. Tani:</span> {detailFarmer.farmerGroup || '-'}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={getStatusColor(detailFarmer.isActive ? 'ACTIVE' : 'INACTIVE')}>{detailFarmer.isActive ? 'Aktif' : 'Tidak Aktif'}</Badge></div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Alamat:</span> {detailFarmer.address || '-'}, {detailFarmer.village || '-'}, {detailFarmer.district || '-'}, {detailFarmer.regency || '-'}, {detailFarmer.province || '-'}
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Riwayat Pesanan ({farmerOrders.length})</h4>
                <ScrollArea className="max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">No. Pesanan</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {farmerOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">Belum ada pesanan</TableCell>
                        </TableRow>
                      ) : (
                        farmerOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="text-xs font-mono">{order.orderNumber}</TableCell>
                            <TableCell className="text-xs text-right">{formatRupiah(order.totalAmount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(order.status)}`}>
                                {getStatusLabel(order.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{formatDate(order.createdAt)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Petani?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data petani akan dihapus permanen.
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