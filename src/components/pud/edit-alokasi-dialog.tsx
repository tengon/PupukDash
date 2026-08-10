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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, Save, RefreshCw, CheckCircle2, Layers, Search } from 'lucide-react'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

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
        title: 'Alokasi Berhasil Diubah',
        description: 'Nilai alokasi tahunan telah tersimpan di database dan terlindungi dari overwrite scraper.',
      })
      setEditingId(null)
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

  const handleStartEdit = (item: AllocationItem) => {
    setEditingId(item.id)
    setEditValue(item.totalAllocationTon.toString())
  }

  const handleSaveEdit = (id: string) => {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0) {
      toast({
        title: 'Nilai Tidak Valid',
        description: 'Masukkan angka alokasi yang valid (ton).',
        variant: 'destructive',
      })
      return
    }
    updateMutation.mutate({ id, totalAllocationTon: val })
  }

  const list = data?.data || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Edit Kuota Alokasi Tahunan (Database)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Edit nilai Alokasi SPJB secara manual. Nilai yang Anda simpan di sini akan **terlindungi dan tidak akan tertimpa saat scraper berjalan**.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari Kecamatan / Kios / Produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 gap-1 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-lg">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
                <TableRow className="text-[11px]">
                  <TableHead className="w-[100px]">Tipe</TableHead>
                  <TableHead>Wilayah / Kios</TableHead>
                  <TableHead className="w-[110px]">Produk</TableHead>
                  <TableHead className="text-right w-[150px]">Alokasi (Ton)</TableHead>
                  <TableHead className="text-right w-[130px]">Realisasi (Ton)</TableHead>
                  <TableHead className="text-right w-[110px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
                      Tidak ada data alokasi ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item) => {
                    const isEditing = editingId === item.id
                    const displayName = item.type === 'PPTS' ? item.pptsName : `Kec. ${item.district || '-'}`

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-bold ${item.type === 'PPTS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {displayName}
                          {item.spjbNumber && (
                            <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                              {item.spjbNumber}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {item.productName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 text-xs font-mono text-right w-28 inline-block bg-background"
                              autoFocus
                            />
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-300">
                              {item.totalAllocationTon.toLocaleString('id-ID')} Ton
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                          {item.totalRealizationTon.toLocaleString('id-ID')} Ton
                          <span className="block text-[10px] font-bold text-emerald-600">
                            ({item.realizationPct.toFixed(1)}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Button
                              size="sm"
                              className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2"
                              disabled={updateMutation.isPending}
                              onClick={() => handleSaveEdit(item.id)}
                            >
                              <Save className="h-3 w-3" />
                              Simpan
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[11px] font-bold px-2 hover:bg-muted"
                              onClick={() => handleStartEdit(item)}
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
