'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { fetchPptsList, createPpts, updatePpts, deletePpts, type Ppts } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { motion } from 'framer-motion'
import { Plus, Search, Pencil, Trash2, Phone, User, Building2, CheckCircle2, Map, Store, MapPin, Hash } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { fetchProvinces, fetchRegencies, fetchDistricts } from '@/lib/wilayah'
import { MapAllocation } from './map-allocation'

const emptyForm = {
  code: '',
  name: '',
  address: '',
  district: '',
  village: '',
  regency: '',
  province: '',
  ownerName: '',
  phone: '',
}
const DISTRICT_THEMES = [
  { badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200', icon: 'text-blue-500' },
  { badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200', icon: 'text-violet-500' },
  { badge: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border-pink-200', icon: 'text-pink-500' },
  { badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200', icon: 'text-orange-500' },
  { badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200', icon: 'text-cyan-500' },
  { badge: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 border-fuchsia-200', icon: 'text-fuchsia-500' },
  { badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200', icon: 'text-sky-500' },
  { badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200', icon: 'text-indigo-500' },
  { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200', icon: 'text-emerald-500' },
  { badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200', icon: 'text-teal-500' },
  { badge: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200', icon: 'text-green-500' },
  { badge: 'bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300 border-lime-200', icon: 'text-lime-500' },
  { badge: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300 border-yellow-200', icon: 'text-yellow-500' },
  { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200', icon: 'text-amber-500' },
  { badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200', icon: 'text-red-500' },
  { badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200', icon: 'text-rose-500' },
  { badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200', icon: 'text-purple-500' },
]

const getDistrictTheme = (district: string) => {
  if (!district) return DISTRICT_THEMES[0]
  let hash = 5381
  for (let i = 0; i < district.length; i++) {
    hash = (hash * 33) ^ district.charCodeAt(i)
  }
  return DISTRICT_THEMES[Math.abs(hash) % DISTRICT_THEMES.length]
}

export function PptsView() {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: pptsList, isLoading } = useQuery({
    queryKey: ['ppts', refreshKey, search],
    queryFn: () => fetchPptsList({ search }),
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

  const createMutation = useMutation({
    mutationFn: createPpts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppts'] })
      triggerRefresh()
      setDialogOpen(false)
      setForm(emptyForm)
      toast({ title: 'Berhasil', description: 'Data PPTS berhasil ditambahkan' })
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updatePpts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppts'] })
      triggerRefresh()
      setDialogOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      toast({ title: 'Berhasil', description: 'Data PPTS berhasil diperbarui' })
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePpts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppts'] })
      triggerRefresh()
      setDeleteOpen(false)
      setDeletingId(null)
      toast({ title: 'Berhasil', description: 'Data PPTS berhasil dihapus' })
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    },
  })

  const handleOpenAdd = () => {
    setForm({
      ...emptyForm,
      code: `PPTS-KDS-00${(pptsList?.length || 0) + 1}`,
    })
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (item: Ppts) => {
    setForm({
      code: item.code || '',
      name: item.name || '',
      ownerName: item.ownerName || '',
      phone: item.phone || '',
      address: item.address || '',
      district: item.district || '',
      village: item.village || '',
      regency: item.regency || '',
      province: item.province || '',
    })
    setEditingId(item.id)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.code.trim()) {
      toast({ title: 'Validasi', description: 'No ID PPTS wajib diisi', variant: 'destructive' })
      return
    }
    if (!form.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama PPTS wajib diisi', variant: 'destructive' })
      return
    }
    if (!form.address.trim()) {
      toast({ title: 'Validasi', description: 'Alamat wajib diisi', variant: 'destructive' })
      return
    }
    if (!form.district.trim()) {
      toast({ title: 'Validasi', description: 'Kecamatan wajib dipilih', variant: 'destructive' })
      return
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId)
  }

  const list = pptsList || []

  // SPJB Allocation Stats
  const districtAllocations = list.reduce((acc, curr) => {
    if (!curr.district) return acc
    if (!acc[curr.district]) {
      acc[curr.district] = { urea: 0, npk: 0 }
    }
    acc[curr.district].urea += (curr.alokasiUrea || 0)
    acc[curr.district].npk += (curr.alokasiNpk || 0)
    return acc
  }, {} as Record<string, { urea: number, npk: number }>)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">

      {/* Alokasi Per Kecamatan Mini Cards */}
      <MapAllocation districtAllocations={districtAllocations} />

      {/* Main Card */}
      <Card className="border-l-2 border-l-primary" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Data PPTS (Pos Penyalur Pupuk Terdaftar)
                <Badge variant="secondary" className="text-[10px] ml-1 font-normal">
                  {list.length} Kios Pengecer
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Kelola data Kios Penyalur Resmi Pupuk Bersubsidi
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari Nama / ID / Kecamatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-full sm:w-64"
                />
              </div>
              <Button onClick={handleOpenAdd} size="sm" className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow transition-all">
                <Plus className="h-4 w-4 mr-1" />
                Tambah PPTS
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
                    <TableHead className="text-xs">No ID PPTS</TableHead>
                    <TableHead className="text-xs">Nama PPTS</TableHead>
                    <TableHead className="text-xs">Alamat & Kecamatan</TableHead>
                    <TableHead className="text-xs">Kontak</TableHead>
                    <TableHead className="text-xs">Data SPJB</TableHead>
                    <TableHead className="text-xs">Alokasi Urea</TableHead>
                    <TableHead className="text-xs">Alokasi NPK</TableHead>
                    <TableHead className="text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                        {search ? 'Tidak ada data PPTS yang cocok' : 'Belum ada data PPTS'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((item) => (
                      <TableRow key={item.id} className="hover:border-l-2 hover:border-l-primary/40 transition-colors">
                        <TableCell className="text-xs font-mono font-medium">
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <Badge variant="outline" className="font-mono text-[11px] bg-emerald-50/50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800">
                              {item.code}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                              <Store className="h-3.5 w-3.5" />
                            </div>
                            <span>{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[220px]">
                          <div className="flex items-center gap-1 text-muted-foreground truncate">
                            <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
                            <span className="truncate" title={item.address}>{item.address}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {item.village && (
                              <span className="text-[10px] text-muted-foreground/70">Desa {item.village}</span>
                            )}
                            <Badge variant="secondary" className={`flex items-center gap-1 text-[9px] h-5 shadow-xs ${getDistrictTheme(item.district).badge}`}>
                              <Map className={`h-3 w-3 ${getDistrictTheme(item.district).icon}`} />
                              {item.district}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="space-y-0.5">
                            {item.ownerName && (
                              <div className="flex items-center gap-1 font-medium">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span>{item.ownerName}</span>
                              </div>
                            )}
                            {item.phone && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                                <Phone className="h-2.5 w-2.5" />
                                <span>{item.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs min-w-[150px]">
                          <div className="space-y-1.5">
                            {item.spjbNumber ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-mono font-medium text-blue-700 dark:text-blue-400" title={item.spjbDate ? `Tanggal Buat: ${item.spjbDate}` : ''}>
                                  {item.spjbNumber}
                                </span>
                                {item.spjbValidFrom && item.spjbValidUntil && (
                                  <span className="text-[9px] text-muted-foreground">
                                    Berlaku: {item.spjbValidFrom} s/d {item.spjbValidUntil}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Belum ada SPJB</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs min-w-[120px]">
                          <Badge variant="outline" className="text-[10px] h-5 bg-amber-50/50 text-amber-700 border-amber-200 px-2 py-0 rounded-full w-fit">
                            Urea: <span className="font-bold ml-1">{item.alokasiUrea || 0}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs min-w-[120px]">
                          <Badge variant="outline" className="text-[10px] h-5 bg-rose-50/50 text-rose-700 border-rose-200 px-2 py-0 rounded-full w-fit">
                            NPK: <span className="font-bold ml-1">{item.alokasiNpk || 0}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(item)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit PPTS</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setDeletingId(item.id); setDeleteOpen(true) }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Hapus PPTS</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Data PPTS' : 'Tambah Data PPTS Baru'}</DialogTitle>
            <DialogDescription>
              Isi formulir data Kios Penyalur Pupuk Terdaftar (PPTS) bersubsidi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">No ID PPTS *</Label>
                <Input
                  placeholder="Misal: PPTS-KDS-001"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="h-9 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama PPTS / Kios *</Label>
                <Input
                  placeholder="Nama Kios Pengecer"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nama Pemilik / Penanggung Jawab</Label>
                <Input
                  placeholder="Nama Pemilik"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">No. Telepon / WhatsApp</Label>
                <Input
                  placeholder="08xxxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Alamat Lengkap *</Label>
              <Input
                placeholder="Jl. Raya No..., RT/RW"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Propinsi *</Label>
                <select
                  value={form.province}
                  onChange={(e) => {
                    setForm({ ...form, province: e.target.value, regency: '', district: '' })
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Pilih Propinsi</option>
                  {provinces?.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kota / Kabupaten *</Label>
                <select
                  value={form.regency}
                  onChange={(e) => {
                    setForm({ ...form, regency: e.target.value, district: '' })
                  }}
                  disabled={!form.province}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">Pilih Kota/Kabupaten</option>
                  {regencies?.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kecamatan *</Label>
                <select
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

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Desa / Kelurahan</Label>
                <Input
                  placeholder="Nama Desa"
                  value={form.village}
                  onChange={(e) => setForm({ ...form, village: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah PPTS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data PPTS?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kios penyalur PPTS ini? Data yang dihapus tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus PPTS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
