'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  fetchDistributions, createDistribution, updateDistribution, deleteDistribution,
  fetchWarehouses, fetchProducts,
  type Distribution, type Warehouse, type Product,
} from '@/lib/api'
import { formatNumber, formatDate, getStatusColor, getStatusLabel } from '@/lib/format'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { Plus, Truck, Pencil, Trash2, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const STATUS_TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_TRANSIT', label: 'Dikirim' },
  { value: 'DELIVERED', label: 'Diterima' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

const STATUS_FLOW: Record<string, string[]> = {
  DRAFT: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export function DistributionsView() {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingDist, setEditingDist] = useState<Distribution | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formWarehouse, setFormWarehouse] = useState('')
  const [formProduct, setFormProduct] = useState('')
  const [formQty, setFormQty] = useState(0)
  const [formVillage, setFormVillage] = useState('')
  const [formGroup, setFormGroup] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const { data: distributions, isLoading } = useQuery({
    queryKey: ['distributions', refreshKey],
    queryFn: fetchDistributions,
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
    mutationFn: createDistribution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] })
      triggerRefresh()
      setDialogOpen(false)
      resetForm()
      toast({ title: 'Berhasil', description: 'Distribusi berhasil dibuat' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; notes?: string } }) => updateDistribution(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] })
      triggerRefresh()
      setStatusDialogOpen(false)
      setEditingDist(null)
      toast({ title: 'Berhasil', description: 'Status distribusi diperbarui' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDistribution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] })
      triggerRefresh()
      setDeleteOpen(false)
      setDeletingId(null)
      toast({ title: 'Berhasil', description: 'Distribusi berhasil dihapus' })
    },
    onError: (err: Error) => toast({ title: 'Gagal', description: err.message, variant: 'destructive' }),
  })

  const resetForm = () => {
    setFormWarehouse('')
    setFormProduct('')
    setFormQty(0)
    setFormVillage('')
    setFormGroup('')
    setFormNotes('')
  }

  const handleSave = () => {
    if (!formWarehouse || !formProduct || formQty <= 0) {
      toast({ title: 'Validasi', description: 'Lengkapi semua field yang wajib', variant: 'destructive' })
      return
    }
    const product = (products || []).find((p) => p.id === formProduct)
    createMutation.mutate({
      warehouseId: formWarehouse,
      productId: formProduct,
      productName: product?.name || '',
      quantity: formQty,
      targetVillage: formVillage || undefined,
      targetGroup: formGroup || undefined,
      notes: formNotes || undefined,
    })
  }

  const handleStatusUpdate = (newStatus: string) => {
    if (editingDist) {
      updateMutation.mutate({ id: editingDist.id, data: { status: newStatus } })
    }
  }

  const handleDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId)
  }

  const filtered = (distributions || []).filter(
    (d) => statusFilter === 'all' || d.status === statusFilter
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Distribusi Pupuk
            </CardTitle>
            <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              Buat Distribusi
            </Button>
          </div>
          <div className="pt-2">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="h-8">
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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
                    <TableHead className="text-xs">No. Distribusi</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Gudang</TableHead>
                    <TableHead className="text-xs">Produk</TableHead>
                    <TableHead className="text-xs text-right">Jumlah (kg)</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Desa Tujuan</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Kel. Tani</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Tanggal</TableHead>
                    <TableHead className="text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                        Tidak ada data distribusi
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((dist, idx) => (
                      <TableRow key={dist.id}>
                        <TableCell className="text-xs font-mono">{dist.distributionNo}</TableCell>
                        <TableCell className="text-xs hidden md:table-cell">{dist.warehouse.name}</TableCell>
                        <TableCell className="text-sm font-medium">{dist.productName}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{formatNumber(dist.quantity)}</TableCell>
                        <TableCell className="text-xs hidden lg:table-cell">{dist.targetVillage || '-'}</TableCell>
                        <TableCell className="text-xs hidden lg:table-cell">{dist.targetGroup || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(dist.status)}`}>
                            {getStatusLabel(dist.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell">{formatDate(dist.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {STATUS_FLOW[dist.status]?.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => { setEditingDist(dist); setStatusDialogOpen(true) }}
                                title="Update Status"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => { setDeletingId(dist.id); setDeleteOpen(true) }}
                            >
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

      {/* Create Distribution Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Distribusi Baru</DialogTitle>
            <DialogDescription>Isi data distribusi pupuk</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Gudang Asal *</Label>
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
              <Label>Jumlah (kg) *</Label>
              <Input type="number" value={formQty || ''} onChange={(e) => setFormQty(parseFloat(e.target.value) || 0)} placeholder="Jumlah dalam kg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Desa Tujuan</Label>
                <Input value={formVillage} onChange={(e) => setFormVillage(e.target.value)} placeholder="Nama desa" />
              </div>
              <div className="grid gap-2">
                <Label>Kelompok Tani</Label>
                <Input value={formGroup} onChange={(e) => setFormGroup(e.target.value)} placeholder="Nama kelompok" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Catatan</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Catatan tambahan..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : 'Buat Distribusi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Status Distribusi</DialogTitle>
            <DialogDescription>
              {editingDist && (
                <span>Distribusi <span className="font-mono font-medium">{editingDist.distributionNo}</span> — Status saat ini: <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(editingDist.status)}`}>{getStatusLabel(editingDist.status)}</Badge></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {editingDist && STATUS_FLOW[editingDist.status]?.map((nextStatus) => (
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
                    {nextStatus === 'IN_TRANSIT' && 'Distribusi sedang dalam perjalanan'}
                    {nextStatus === 'DELIVERED' && 'Pupuk telah diterima di tujuan'}
                    {nextStatus === 'CANCELLED' && 'Batalkan distribusi ini'}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Distribusi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data distribusi akan dihapus permanen.
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