'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  fetchDistributions, createDistribution, updateDistribution, deleteDistribution,
  fetchWarehouses, fetchProducts,
  type Distribution,
} from '@/lib/api'
import { formatNumber, formatDate, getStatusLabel, getProductImage } from '@/lib/format'
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
import { Plus, Truck, Pencil, Trash2, ArrowRight, FileText, CheckCircle, XCircle, Search, Package, MapPin, UserCircle, ClipboardList, BarChart3, Navigation } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ITEMS_PER_PAGE = 10

const STATUS_TABS = [
  { value: 'all', label: 'Semua', icon: null },
  { value: 'DRAFT', label: 'Draft', icon: FileText },
  { value: 'IN_TRANSIT', label: 'Dikirim', icon: Truck },
  { value: 'DELIVERED', label: 'Diterima', icon: CheckCircle },
  { value: 'CANCELLED', label: 'Dibatalkan', icon: XCircle },
]

const STATUS_FLOW: Record<string, string[]> = {
  DRAFT: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  DELIVERED: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

const STATUS_PROGRESS: Record<string, { width: string; color: string }> = {
  DRAFT: { width: '25%', color: 'bg-gray-400' },
  IN_TRANSIT: { width: '60%', color: 'bg-blue-500' },
  DELIVERED: { width: '100%', color: 'bg-green-500' },
  CANCELLED: { width: '0%', color: 'bg-red-500' },
}

const STATUS_LEFT_BORDER: Record<string, string> = {
  DRAFT: 'border-l-2 border-l-gray-300 dark:border-l-gray-600',
  IN_TRANSIT: 'border-l-2 border-l-amber-500',
  DELIVERED: 'border-l-2 border-l-green-500',
  CANCELLED: 'border-l-2 border-l-red-400',
}

function StatusFlowDots({ status }: { status: string }) {
  const steps = ['DRAFT', 'IN_TRANSIT', 'DELIVERED']
  const currentIdx = steps.indexOf(status)
  const isCancelled = status === 'CANCELLED'

  return (
    <div className="flex items-center gap-0.5">
      {steps.map((step, idx) => {
        const isActive = !isCancelled && idx <= currentIdx
        const isCurrent = !isCancelled && idx === currentIdx
        return (
          <div key={step} className="flex items-center">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isCancelled ? 'bg-red-300 dark:bg-red-700' :
              isActive ? (isCurrent ? 'bg-blue-500 dark:bg-blue-400 scale-110' : 'bg-green-500 dark:bg-green-400') :
              'bg-muted-foreground/25'
            }`} />
            {idx < steps.length - 1 && (
              <div className={`w-3 h-0.5 transition-all duration-300 ${
                !isCancelled && idx < currentIdx ? 'bg-green-400' : 'bg-muted-foreground/15'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
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
  const [statusNotes, setStatusNotes] = useState('')
  const [page, setPage] = useState(1)

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
      updateMutation.mutate({ id: editingDist.id, data: { status: newStatus, notes: statusNotes || undefined } })
    }
  }

  const handleDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId)
  }

  const filtered = (distributions || []).filter(
    (d) => statusFilter === 'all' || d.status === statusFilter
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(safePage * ITEMS_PER_PAGE, filtered.length)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* Summary Stats Cards */}
      {!isLoading && distributions && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-gradient-to-r from-blue-50/60 to-white dark:from-blue-900/10 dark:to-card p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Total Distribusi</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{distributions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-r from-amber-50/60 to-white dark:from-amber-900/10 dark:to-card p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Navigation className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Dalam Pengiriman</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{distributions.filter(d => d.status === 'IN_TRANSIT').length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-green-200/60 dark:border-green-800/40 bg-gradient-to-r from-green-50/60 to-white dark:from-green-900/10 dark:to-card p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Diterima</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{distributions.filter(d => d.status === 'DELIVERED').length}</p>
            </div>
          </div>
        </div>
      )}
      <Card className="border-l-4 border-blue-500">
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
            <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <TabsList className="h-8">
                {STATUS_TABS.map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3 gap-1">
                      {TabIcon && <TabIcon className="h-3 w-3" />}
                      {tab.label}
                    </TabsTrigger>
                  )
                })}
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
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">No. Distribusi</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Gudang</TableHead>
                      <TableHead className="text-xs">Produk</TableHead>
                      <TableHead className="text-xs text-right">Jumlah (kg)</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Tujuan</TableHead>
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
                            <Truck className="h-10 w-10 opacity-30" />
                            <p className="text-sm font-medium">Tidak ada data distribusi</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((dist) => {
                        const progress = STATUS_PROGRESS[dist.status] || STATUS_PROGRESS.DRAFT
                        const leftBorder = STATUS_LEFT_BORDER[dist.status] || STATUS_LEFT_BORDER.DRAFT
                        const isInTransit = dist.status === 'IN_TRANSIT'
                        return (
                          <TableRow key={dist.id} className={`row-animate ${leftBorder}`}>
                            <TableCell className="text-xs font-mono">
                              <div className="flex items-center gap-1.5">
                                <Truck className={`h-3.5 w-3.5 text-blue-500 shrink-0 ${isInTransit ? 'truck-pulse-amber' : ''}`} />
                                {dist.distributionNo}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs hidden md:table-cell">{dist.warehouse.name}</TableCell>
                            <TableCell className="text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded border border-border bg-white dark:bg-zinc-900 p-0.5 flex items-center justify-center shrink-0 shadow-xs">
                                  <img
                                    src={getProductImage(dist.productName)}
                                    alt={dist.productName}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <span>{dist.productName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-right font-mono">{formatNumber(dist.quantity)}</TableCell>
                            <TableCell className="text-xs hidden lg:table-cell">
                              {(dist.targetVillage || dist.targetGroup) ? (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[140px]">
                                    {dist.targetVillage}{dist.targetVillage && dist.targetGroup ? ' · ' : ''}{dist.targetGroup}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE_STYLES[dist.status] || ''}`}>
                                    {getStatusLabel(dist.status)}
                                  </Badge>
                                  <StatusFlowDots status={dist.status} />
                                </div>
                                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-500 ${progress.color}`} style={{ width: progress.width }} />
                                </div>
                              </div>
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
                        )
                      })
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
      <Dialog open={statusDialogOpen} onOpenChange={(open) => { setStatusDialogOpen(open); if (!open) { setStatusNotes(''); setEditingDist(null) } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              Detail & Update Status
            </DialogTitle>
            <DialogDescription>Perbarui status distribusi</DialogDescription>
          </DialogHeader>
          {editingDist && (
            <div className="space-y-4">
              {/* Distribution Info */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-1.5 py-0.5 rounded">{editingDist.distributionNo}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE_STYLES[editingDist.status] || ''}`}>
                    {getStatusLabel(editingDist.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <Package className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{editingDist.productName}</p>
                      <p>{formatNumber(editingDist.quantity)} kg</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{editingDist.warehouse.name}</p>
                      <p className="text-[10px]">{editingDist.warehouse.code}</p>
                    </div>
                  </div>
                </div>
                {(editingDist.targetVillage || editingDist.targetGroup) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {editingDist.targetVillage && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        <span>{editingDist.targetVillage}</span>
                      </div>
                    )}
                    {editingDist.targetGroup && (
                      <div className="flex items-center gap-1.5">
                        <UserCircle className="h-3 w-3" />
                        <span>{editingDist.targetGroup}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Visual Status Flow */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alur Status</p>
                <div className="flex items-center justify-between gap-1 px-1">
                  {[
                    { key: 'DRAFT', label: 'Draft', Icon: FileText },
                    { key: 'IN_TRANSIT', label: 'Dalam Pengiriman', Icon: Truck },
                    { key: 'DELIVERED', label: 'Diterima', Icon: CheckCircle },
                  ].map((step, i) => {
                    const statusOrder = ['DRAFT', 'IN_TRANSIT', 'DELIVERED']
                    const currentIdx = statusOrder.indexOf(editingDist.status)
                    const stepIdx = i
                    const isCompleted = stepIdx < currentIdx
                    const isCurrent = step.key === editingDist.status
                    const isCancelled = editingDist.status === 'CANCELLED'

                    return (
                      <div key={step.key} className="flex-1 flex items-center">
                        <div className={`flex-1 flex flex-col items-center gap-1.5`}>
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                            isCancelled
                              ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                              : isCompleted
                                ? 'border-green-500 bg-green-500 text-white'
                                : isCurrent
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-200 dark:ring-green-800'
                                  : 'border-muted-foreground/30 bg-muted/30'
                          }`}>
                            {isCancelled && step.key === 'DRAFT' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : isCompleted ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <step.Icon className={`h-4 w-4 ${isCurrent ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/50'}`} />
                            )}
                          </div>
                          <span className={`text-[10px] text-center leading-tight ${isCurrent ? 'font-semibold text-green-600 dark:text-green-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {step.label}
                          </span>
                        </div>
                        {i < 2 && (
                          <div className={`h-0.5 w-4 -mx-0.5 shrink-0 ${isCompleted || (isCurrent && i < currentIdx) ? 'bg-green-500' : 'bg-muted-foreground/20'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
                {editingDist.status === 'CANCELLED' && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <XCircle className="h-3.5 w-3.5" />
                    <span className="font-medium">Distribusi dibatalkan</span>
                  </div>
                )}
              </div>

              {/* Notes Field */}
              {STATUS_FLOW[editingDist.status]?.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="status-notes" className="text-xs">Catatan (opsional)</Label>
                  <Textarea
                    id="status-notes"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Tambahkan catatan untuk perubahan status ini..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aksi</p>
                {STATUS_FLOW[editingDist.status]?.map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    variant="outline"
                    className={`justify-start h-12 w-full ${nextStatus === 'CANCELLED' ? 'border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                    onClick={() => handleStatusUpdate(nextStatus)}
                    disabled={updateMutation.isPending}
                  >
                    {nextStatus === 'CANCELLED' ? (
                      <XCircle className="h-4 w-4 mr-2 shrink-0 text-red-500" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2 shrink-0 text-green-600 dark:text-green-400" />
                    )}
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
                {STATUS_FLOW[editingDist.status]?.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Status sudah final, tidak dapat diubah lagi.
                  </p>
                )}
              </div>
            </div>
          )}
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