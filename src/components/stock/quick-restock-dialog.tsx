'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { addStock, type StockWithProductAndWarehouse } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PackagePlus, Warehouse as WarehouseIcon, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface QuickRestockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stock: StockWithProductAndWarehouse
}

export function QuickRestockDialog({ open, onOpenChange, stock }: QuickRestockDialogProps) {
  const { triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState('')

  const mutation = useMutation({
    mutationFn: addStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      triggerRefresh()
      setQuantity('')
      onOpenChange(false)
      toast({
        title: 'Berhasil',
        description: `Stok ${stock.product.name} di ${stock.warehouse.name} berhasil ditambahkan`,
      })
    },
    onError: (err: Error) => {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' })
    },
  })

  const handleRestock = () => {
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) {
      toast({ title: 'Validasi', description: 'Jumlah harus lebih dari 0', variant: 'destructive' })
      return
    }
    mutation.mutate({
      warehouseId: stock.warehouseId,
      productId: stock.productId,
      quantity: qty,
      isRestock: true,
    })
  }

  const newTotal = stock.quantity + (parseFloat(quantity) || 0)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setQuantity(''); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Restok Cepat
          </DialogTitle>
          <DialogDescription>
            Tambahkan stok dengan cepat
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Pre-filled info */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">{stock.product.name}</p>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 mt-0.5">
                  {stock.product.type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <WarehouseIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{stock.warehouse.name} ({stock.warehouse.code})</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Stok saat ini</span>
              <span className="font-mono font-semibold">{formatNumber(stock.quantity)} kg</span>
            </div>
          </div>

          {/* Quantity input */}
          <div className="grid gap-2">
            <Label htmlFor="restock-qty">Jumlah Restock (kg) *</Label>
            <Input
              id="restock-qty"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Masukkan jumlah kg..."
              min={1}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRestock()
              }}
            />
          </div>

          {/* Preview new total */}
          {parseFloat(quantity) > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total stok setelah restock</span>
                <span className="font-bold font-mono text-primary">{formatNumber(newTotal)} kg</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setQuantity(''); onOpenChange(false) }}>
            Batal
          </Button>
          <Button
            onClick={handleRestock}
            disabled={mutation.isPending || !parseFloat(quantity)}
            className="btn-gradient"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Restok Sekarang'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}