'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, Save, RefreshCw, Layers, Search, MapPin, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AllocationItem {
  id: string
  year: string
  type: string
  spjbNumber: string | null
  distributorName: string | null
  producerName: string | null
  pptsCode: string | null
  pptsName: string | null
  district: string | null
  productName: string
  totalAllocationTon: number
  totalRealizationTon: number
  totalRemainingTon: number
  realizationPct: number
}

export function EditAlokasiDialog({
  open,
  onOpenChange,
  initialSearch = '',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSearch?: string
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState(initialSearch)
  const [formInputs, setFormInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setSearch(initialSearch)
    }
  }, [open, initialSearch])

  const { data, isLoading, refetch, isFetching } = useQuery<{ success: boolean; data: AllocationItem[] }>({
    queryKey: ['allocation-list', search],
    queryFn: async () => {
      const res = await fetch(`/api/allocation?search=${encodeURIComponent(search)}`)
      if (!res.ok) throw new Error('Gagal mengambil data alokasi')
      return res.json()
    },
    enabled: open,
  })

  const list = data?.data || []

  // Initialize form input values whenever list changes
  useEffect(() => {
    if (list.length > 0) {
      const initial: Record<string, string> = {}
      list.forEach((item) => {
        initial[item.id] = item.totalAllocationTon.toString()
      })
      setFormInputs(initial)
    }
  }, [list])

  const updateMutation = useMutation({
    mutationFn: async ({ id, totalAllocationTon }: { id: string; totalAllocationTon: number }) => {
      const res = await fetch(`/api/allocation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalAllocationTon }),
      })
      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.message || 'Gagal mengubah nilai Alokasi')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: 'Form Alokasi Berhasil Disimpan',
        description: 'Nilai Alokasi Baru telah tersimpan di database dan terlindungi dari overwrite scraper.',
      })
      refetch()
      queryClient.invalidateQueries({ queryKey: ['spjbOperasional'] })
      queryClient.invalidateQueries({ queryKey: ['ppts'] })
      queryClient.invalidateQueries({ queryKey: ['spjb-ppts'] })
    },
    onError: (err: Error) => {
      toast({
        title: 'Gagal Mengubah Alokasi',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  const handleInputChange = (id: string, value: string) => {
    setFormInputs((prev) => ({ ...prev, [id]: value }))
  }

  const handleSaveItem = (item: AllocationItem) => {
    const rawVal = formInputs[item.id]
    const val = parseFloat(rawVal)
    if (isNaN(val) || val < 0) {
      toast({
        title: 'Nilai Alokasi Tidak Valid',
        description: 'Masukkan angka alokasi baru yang valid dalam Ton.',
        variant: 'destructive',
      })
      return
    }
    updateMutation.mutate({ id: item.id, totalAllocationTon: val })
  }

  const districtTitle = search ? search.toUpperCase() : 'SEMUA WILAYAH'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Form Edit Kuota Alokasi Tahunan (Database)
          </DialogTitle>

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari Kecamatan / Kios / Produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 px-2.5 text-xs gap-1 shrink-0">
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground italic">
              Tidak ada data alokasi untuk &quot;{search}&quot;. Coba ganti kata kunci pencarian.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <MapPin className="h-4 w-4" />
                <span>FORM EDIT ALOKASI KECAMATAN / WILAYAH: {districtTitle}</span>
              </div>

              {list.map((item) => {
                const newAlloc = parseFloat(formInputs[item.id]) || 0
                const currentReal = item.totalRealizationTon || 0
                const estRemaining = Math.max(0, newAlloc - currentReal)
                const estPct = newAlloc > 0 ? (currentReal / newAlloc) * 100 : 0

                let prodBadgeClass = 'bg-blue-500/10 text-blue-700 border-blue-200'
                if (item.productName.includes('UREA')) {
                  prodBadgeClass = 'bg-emerald-500/10 text-emerald-700 border-emerald-300'
                } else if (item.productName.includes('NPK')) {
                  prodBadgeClass = 'bg-blue-500/10 text-blue-700 border-blue-300'
                } else if (item.productName.includes('ORGANIK')) {
                  prodBadgeClass = 'bg-amber-500/10 text-amber-700 border-amber-300'
                }

                return (
                  <Card key={item.id} className="border shadow-2xs">
                    <CardContent className="p-3.5 space-y-3">
                      {/* Product Header */}
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs font-extrabold px-2 py-0.5 ${prodBadgeClass}`}>
                            PRODUK {item.productName}
                          </Badge>
                          <span className="text-xs font-bold text-foreground">
                            {item.type === 'PPTS' ? item.pptsName : `Kec. ${item.district || '-'}`}
                          </span>
                        </div>
                        {item.spjbNumber && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            No SPJB: {item.spjbNumber}
                          </span>
                        )}
                      </div>

                      {/* FORM FIELDS GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* 1. ALOKASI SEBELUMNYA */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-muted-foreground">
                            1. Alokasi Sebelumnya (Eksisting)
                          </Label>
                          <div className="h-9 px-3 rounded-lg border bg-muted/60 flex items-center justify-between font-mono text-xs">
                            <span className="text-muted-foreground">Nilai Sebelumnya:</span>
                            <span className="font-extrabold text-foreground">{item.totalAllocationTon.toLocaleString('id-ID')} Ton</span>
                          </div>
                        </div>

                        {/* 2. ALOKASI BARU */}
                        <div className="space-y-1">
                          <Label htmlFor={`input-${item.id}`} className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <Pencil className="h-3 w-3 text-emerald-600" />
                            2. Alokasi Baru (Ton)
                          </Label>
                          <div className="flex gap-1.5">
                            <Input
                              id={`input-${item.id}`}
                              type="number"
                              step="0.1"
                              value={formInputs[item.id] || ''}
                              onChange={(e) => handleInputChange(item.id, e.target.value)}
                              placeholder="Input Alokasi Baru..."
                              className="h-9 text-xs font-mono font-bold text-right bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500"
                            />
                            <Button
                              size="sm"
                              className="h-9 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 shrink-0"
                              disabled={updateMutation.isPending}
                              onClick={() => handleSaveItem(item)}
                            >
                              <Save className="h-3.5 w-3.5" />
                              Simpan
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* LIVE CALCULATION PREVIEW */}
                      <div className="p-2 rounded-lg bg-muted/40 border text-[11px] font-mono flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Realisasi Tebusan: <strong className="text-foreground">{currentReal.toLocaleString('id-ID')} Ton</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                            Estimasi Sisa Baru: <strong>{estRemaining.toLocaleString('id-ID')} Ton</strong>
                          </span>
                          <Badge variant="outline" className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border-emerald-300">
                            {estPct.toFixed(1)}% Realisasi
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
