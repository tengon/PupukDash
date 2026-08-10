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
import { Pencil, Save, RefreshCw, Layers, Search, MapPin, Building2, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react'
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
  const [selectedItem, setSelectedItem] = useState<AllocationItem | null>(null)
  const [newAllocInput, setNewAllocInput] = useState<string>('')

  useEffect(() => {
    if (open) {
      setSearch(initialSearch)
    }
  }, [open, initialSearch])

  const { data, isLoading, refetch } = useQuery<{ success: boolean; data: AllocationItem[] }>({
    queryKey: ['allocation-list', search],
    queryFn: async () => {
      const res = await fetch(`/api/allocation?search=${encodeURIComponent(search)}`)
      if (!res.ok) throw new Error('Gagal mengambil data alokasi')
      return res.json()
    },
    enabled: open,
  })

  const list = data?.data || []

  // Auto-select first item when searching specifically for a kecamatan
  useEffect(() => {
    if (list.length > 0 && (!selectedItem || !list.some(i => i.id === selectedItem.id))) {
      setSelectedItem(list[0])
      setNewAllocInput(list[0].totalAllocationTon.toString())
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
    onSuccess: (res) => {
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

  const handleSelectFormItem = (item: AllocationItem) => {
    setSelectedItem(item)
    setNewAllocInput(item.totalAllocationTon.toString())
  }

  const handleSaveForm = () => {
    if (!selectedItem) return
    const val = parseFloat(newAllocInput)
    if (isNaN(val) || val < 0) {
      toast({
        title: 'Nilai Alokasi Tidak Valid',
        description: 'Masukkan angka alokasi baru yang valid dalam Ton.',
        variant: 'destructive',
      })
      return
    }
    updateMutation.mutate({ id: selectedItem.id, totalAllocationTon: val })
  }

  // Calculated Preview values
  const parsedNewAlloc = parseFloat(newAllocInput) || 0
  const currentReal = selectedItem?.totalRealizationTon || 0
  const estRemaining = Math.max(0, parsedNewAlloc - currentReal)
  const estPct = parsedNewAlloc > 0 ? (currentReal / parsedNewAlloc) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Form Edit Kuota Alokasi Tahunan (Database)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Kelola dan ubah Alokasi Tahunan via Form. Nilai Alokasi Baru yang disimpan di sini akan **terkunci di database dan terlindungi dari overwrite scraper**.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x overflow-hidden">
          {/* Left Panel: List Selector */}
          <div className="md:col-span-5 flex flex-col p-3 space-y-2 bg-muted/10 overflow-hidden">
            <div className="flex items-center gap-1.5 pb-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari Kecamatan / Kios / Produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 px-2 text-xs shrink-0">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {isLoading ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : list.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground italic">
                  Data alokasi tidak ditemukan.
                </div>
              ) : (
                list.map((item) => {
                  const isSelected = selectedItem?.id === item.id
                  const displayName = item.type === 'PPTS' ? item.pptsName : `Kec. ${item.district || '-'}`

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectFormItem(item)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-50/90 border-emerald-500 shadow-2xs dark:bg-emerald-950/40'
                          : 'bg-card hover:bg-muted/50 border-border/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 font-bold shrink-0 ${item.type === 'PPTS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {item.type}
                          </Badge>
                          <span className="font-bold truncate text-foreground">{displayName}</span>
                        </div>
                        <Badge variant="secondary" className="text-[9px] font-bold shrink-0">
                          {item.productName}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-muted-foreground font-mono pt-0.5">
                        <span>Alokasi: <strong className="text-foreground">{item.totalAllocationTon.toLocaleString('id-ID')} Ton</strong></span>
                        <span className="text-emerald-600 font-semibold">{item.totalRealizationTon.toLocaleString('id-ID')} Ton ({item.realizationPct.toFixed(0)}%)</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel: Form Editor */}
          <div className="md:col-span-7 flex flex-col p-4 space-y-4 overflow-y-auto bg-background">
            {selectedItem ? (
              <div className="space-y-4">
                {/* Information Header Card */}
                <div className="p-3 rounded-xl border bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <span>{selectedItem.type === 'PPTS' ? selectedItem.pptsName : `Kecamatan ${selectedItem.district || '-'}`}</span>
                    </div>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-xs">
                      Produk {selectedItem.productName}
                    </Badge>
                  </div>
                  {selectedItem.spjbNumber && (
                    <p className="text-[11px] text-muted-foreground font-mono">
                      No SPJB: <strong className="text-foreground">{selectedItem.spjbNumber}</strong>
                    </p>
                  )}
                </div>

                {/* FORM INPUTS */}
                <Card className="border shadow-2xs">
                  <CardContent className="p-4 space-y-4">
                    {/* FORM FIELD 1: ALOKASI SEBELUMNYA */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                        1. Alokasi Sebelumnya (Eksisting Sistem)
                      </Label>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/50 text-xs font-mono font-bold">
                        <span className="text-muted-foreground">Kuota Alokasi Sebelumnya:</span>
                        <Badge variant="secondary" className="text-sm font-extrabold px-3 py-1 bg-background border">
                          {selectedItem.totalAllocationTon.toLocaleString('id-ID')} Ton
                        </Badge>
                      </div>
                    </div>

                    {/* FORM FIELD 2: ALOKASI BARU */}
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="newAllocInput" className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <Pencil className="h-3.5 w-3.5 text-emerald-600" />
                        2. Alokasi Baru (Ton)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="newAllocInput"
                          type="number"
                          step="0.1"
                          value={newAllocInput}
                          onChange={(e) => setNewAllocInput(e.target.value)}
                          placeholder="Masukkan nilai alokasi baru..."
                          className="h-10 text-sm font-mono font-bold text-right bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 focus:ring-emerald-500"
                        />
                        <div className="h-10 px-3 bg-muted rounded-lg flex items-center justify-center font-bold text-xs text-muted-foreground border">
                          Ton
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* LIVE CALCULATION PREVIEW CARD */}
                <div className="p-3.5 rounded-xl border bg-card space-y-2.5 border-border/80 text-xs">
                  <span className="font-bold text-xs text-muted-foreground block border-b pb-1.5">
                    📊 Ringkasan Kalkulasi Otomatis Sistem:
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-muted/40 border">
                      <span className="text-[10px] text-muted-foreground block">Realisasi Tebusan (GOW CM):</span>
                      <span className="font-bold text-foreground text-sm">{currentReal.toLocaleString('id-ID')} Ton</span>
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-bold">Estimasi Sisa Alokasi Baru:</span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                        {estRemaining.toLocaleString('id-ID')} Ton
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                    <span className="text-muted-foreground">Prosentase Realisasi Baru:</span>
                    <Badge variant="outline" className="font-extrabold bg-emerald-100 text-emerald-800 border-emerald-300">
                      {estPct.toFixed(1)}% Realisasi
                    </Badge>
                  </div>
                </div>

                {/* FORM ACTION BUTTONS */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-9 px-4 text-xs font-medium">
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 px-5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                    disabled={updateMutation.isPending}
                    onClick={handleSaveForm}
                  >
                    <Save className="h-4 w-4" />
                    {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Alokasi Baru'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                <Layers className="h-10 w-10 opacity-30 mb-2" />
                <p className="text-xs">Pilih data alokasi di sebelah kiri untuk mengisi form edit.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
