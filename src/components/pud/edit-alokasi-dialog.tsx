'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, Save, RefreshCw, Layers, Search, MapPin, Calculator, X } from 'lucide-react'
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
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(0)
  const [newAllocInput, setNewAllocInput] = useState<string>('')

  useEffect(() => {
    if (open) {
      setSearch(initialSearch)
      setSelectedProductIndex(0)
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
  const currentItem: AllocationItem | undefined = list[selectedProductIndex] || list[0]

  // Update input field whenever currentItem changes
  useEffect(() => {
    if (currentItem) {
      setNewAllocInput(currentItem.totalAllocationTon.toString())
    }
  }, [currentItem?.id, currentItem?.totalAllocationTon])

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
        title: 'Alokasi Berhasil Disimpan',
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

  const handleSave = () => {
    if (!currentItem) return
    const val = parseFloat(newAllocInput)
    if (isNaN(val) || val < 0) {
      toast({
        title: 'Nilai Tidak Valid',
        description: 'Masukkan angka alokasi baru yang valid dalam Ton.',
        variant: 'destructive',
      })
      return
    }
    updateMutation.mutate({ id: currentItem.id, totalAllocationTon: val })
  }

  // Calculate live previews
  const parsedNewAlloc = parseFloat(newAllocInput) || 0
  const currentReal = currentItem?.totalRealizationTon || 0
  const estRemaining = Math.max(0, parsedNewAlloc - currentReal)
  const estPct = parsedNewAlloc > 0 ? (currentReal / parsedNewAlloc) * 100 : 0

  const districtName = currentItem
    ? currentItem.type === 'PPTS'
      ? currentItem.pptsName
      : `Kec. ${currentItem.district || '-'}`
    : search || 'Kec. Tuntang'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border shadow-lg">
        {/* Header Dialog */}
        <DialogHeader className="p-4 border-b bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-foreground">
              <Pencil className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              📝 Form Edit Alokasi Tahunan
            </DialogTitle>
          </div>

          {/* Subheader Line */}
          <div className="pt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-extrabold">
              <MapPin className="h-3.5 w-3.5" />
              Wilayah: {districtName}
            </span>
            {currentItem && (
              <>
                <span>|</span>
                <span className="font-bold text-foreground">
                  Produk: <Badge variant="secondary" className="font-extrabold text-xs px-2 py-0 bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">{currentItem.productName}</Badge>
                </span>
                {currentItem.spjbNumber && (
                  <>
                    <span>|</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      No SPJB: {currentItem.spjbNumber}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-xs text-muted-foreground italic">
                Data alokasi untuk &quot;{search}&quot; tidak ditemukan.
              </p>
              <div className="relative max-w-xs mx-auto pt-2">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari Kecamatan lain..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Product Tabs (If multiple products exist for this Kecamatan) */}
              {list.length > 1 && (
                <div className="flex items-center gap-1.5 border-b pb-2 overflow-x-auto">
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">Pilih Produk:</span>
                  {list.map((item, idx) => (
                    <Button
                      key={item.id}
                      variant={selectedProductIndex === idx ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 text-xs font-bold px-3 transition-all ${
                        selectedProductIndex === idx
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                          : 'text-muted-foreground'
                      }`}
                      onClick={() => setSelectedProductIndex(idx)}
                    >
                      {item.productName} ({item.totalAllocationTon.toLocaleString('id-ID')} Ton)
                    </Button>
                  ))}
                </div>
              )}

              {currentItem && (
                <div className="space-y-4">
                  {/* SECTION 1: ALOKASI SEBELUMNYA */}
                  <Card className="border shadow-2xs bg-muted/20">
                    <CardContent className="p-3.5 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                        📌 1. Alokasi Sebelumnya (Eksisting Sistem)
                      </Label>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background text-xs font-mono font-bold">
                        <span className="text-muted-foreground">Kuota Alokasi Saat Ini:</span>
                        <Badge variant="outline" className="text-sm font-extrabold px-3.5 py-1 bg-muted/80 text-foreground border-border/80">
                          {currentItem.totalAllocationTon.toLocaleString('id-ID')} Ton
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SECTION 2: ALOKASI BARU */}
                  <Card className="border-2 border-emerald-500/40 shadow-2xs bg-emerald-50/30 dark:bg-emerald-950/20">
                    <CardContent className="p-3.5 space-y-2">
                      <Label htmlFor="newAllocInput" className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Pencil className="h-3.5 w-3.5 text-emerald-600" />
                        ✏️ 2. Alokasi Baru (Ton)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="newAllocInput"
                          type="number"
                          step="0.1"
                          value={newAllocInput}
                          onChange={(e) => setNewAllocInput(e.target.value)}
                          placeholder="Masukkan alokasi baru..."
                          className="h-10 text-base font-mono font-extrabold text-right bg-background border-emerald-500 focus:ring-emerald-500"
                          autoFocus
                        />
                        <div className="h-10 px-3.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-lg flex items-center justify-center font-extrabold text-xs text-emerald-900 dark:text-emerald-200 border border-emerald-300">
                          Ton
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SECTION 3: RINGKASAN KALKULASI OTOMATIS SISTEM */}
                  <div className="p-3.5 rounded-xl border bg-card space-y-2 border-border/80 text-xs font-mono">
                    <span className="font-bold text-xs text-muted-foreground flex items-center gap-1.5 border-b pb-1.5">
                      <Calculator className="h-3.5 w-3.5 text-emerald-600" />
                      📊 Ringkasan Kalkulasi Otomatis Sistem:
                    </span>

                    <div className="space-y-1.5 text-xs pt-0.5">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>• Realisasi Tebusan GOW CM:</span>
                        <span className="font-bold text-foreground tabular-nums">
                          {currentReal.toLocaleString('id-ID')} Ton
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-300 pt-1 border-t border-dashed">
                        <span className="font-bold">• Estimasi Sisa Alokasi Baru:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm tabular-nums">
                            {estRemaining.toLocaleString('id-ID')} Ton
                          </span>
                          <Badge variant="outline" className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border-emerald-300">
                            {estPct.toFixed(1)}% Realisasi
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-9 px-4 text-xs font-semibold">
            Batal
          </Button>
          <Button
            size="sm"
            className="h-9 px-5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
            disabled={updateMutation.isPending || !currentItem}
            onClick={handleSave}
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Alokasi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
