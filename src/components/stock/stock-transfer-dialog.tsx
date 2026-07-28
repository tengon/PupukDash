'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWarehouses, fetchProducts, transferStock } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { ArrowLeftRight, Warehouse, Package, AlertTriangle, Loader2 } from 'lucide-react'

type Step = 1 | 2 | 3

interface StockTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultFromWarehouseId?: string
  defaultProductId?: string
}

export function StockTransferDialog({
  open,
  onOpenChange,
  defaultFromWarehouseId,
  defaultProductId,
}: StockTransferDialogProps) {
  const { triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>(1)
  const [fromWarehouseId, setFromWarehouseId] = useState(defaultFromWarehouseId || '')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [productId, setProductId] = useState(defaultProductId || '')
  const [quantity, setQuantity] = useState<number>(0)

  const handleDialogChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset state on close
      setStep(1)
      setFromWarehouseId('')
      setToWarehouseId('')
      setProductId('')
      setQuantity(0)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  // Re-apply defaults when dialog opens with new props
  const resolvedFromWarehouse = open ? (fromWarehouseId || defaultFromWarehouseId || '') : ''
  const resolvedProduct = open ? (productId || defaultProductId || '') : ''

  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: fetchWarehouses,
  })

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const { data: stocks } = useQuery({
    queryKey: ['stock'],
    queryFn: async () => {
      const res = await fetch('/api/stock')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Current available stock for the selected from-warehouse + product combo
  const availableStock = useMemo(() => {
    if (!stocks || !resolvedFromWarehouse || !resolvedProduct) return 0
    const entry = stocks.find(
      (s: { warehouseId: string; productId: string; quantity: number }) =>
        s.warehouseId === resolvedFromWarehouse && s.productId === resolvedProduct
    )
    return entry?.quantity ?? 0
  }, [stocks, resolvedFromWarehouse, resolvedProduct])

  const fromWarehouse = useMemo(
    () => warehouses?.find((w) => w.id === resolvedFromWarehouse),
    [warehouses, resolvedFromWarehouse]
  )

  const toWarehouse = useMemo(
    () => warehouses?.find((w) => w.id === toWarehouseId),
    [warehouses, toWarehouseId]
  )

  const selectedProduct = useMemo(
    () => products?.find((p) => p.id === resolvedProduct),
    [products, resolvedProduct]
  )

  const isOverStock = quantity > 0 && quantity > availableStock
  const canSubmit = resolvedFromWarehouse && toWarehouseId && resolvedProduct && quantity > 0 && !isOverStock

  const filteredWarehouses = (excludeId?: string) =>
    warehouses?.filter((w) => w.id !== excludeId) ?? []

  const transferMutation = useMutation({
    mutationFn: transferStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      triggerRefresh()
      handleDialogChange(false)
      toast({
        title: 'Transfer Berhasil',
        description: `${formatNumber(quantity)} kg ${selectedProduct?.name || 'produk'} berhasil ditransfer dari ${fromWarehouse?.name || 'gudang asal'} ke ${toWarehouse?.name || 'gudang tujuan'}`,
      })
    },
    onError: (err: Error) => {
      toast({
        title: 'Transfer Gagal',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as Step)
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step)
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    transferMutation.mutate({ fromWarehouseId: resolvedFromWarehouse, toWarehouseId, productId: resolvedProduct, quantity })
  }

  const stepLabels = [
    { num: 1, label: 'Sumber' },
    { num: 2, label: 'Tujuan' },
    { num: 3, label: 'Jumlah' },
  ]

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-black/5 dark:ring-white/5">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
            </div>
            Transfer Stok Antar Gudang
          </DialogTitle>
          <DialogDescription className="sr-only">
            Dialog untuk mentransfer stok antar gudang
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {stepLabels.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    step >= s.num
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.num}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    step >= s.num ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full transition-colors ${
                    step > s.num ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="grid gap-4"
        >
          {/* Step 1: Source */}
          {step === 1 && (
            <>
              <div className="grid gap-2">
                <Label>Gudang Asal *</Label>
                <Select
                  value={resolvedFromWarehouse}
                  onValueChange={setFromWarehouseId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={warehousesLoading ? 'Memuat...' : 'Pilih gudang asal'} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                          {w.name} <span className="text-muted-foreground text-xs">({w.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Produk *</Label>
                <Select value={resolvedProduct} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder={productsLoading ? 'Memuat...' : 'Pilih produk'} />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.name}
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1">
                            {p.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {resolvedFromWarehouse && resolvedProduct && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Stok tersedia</span>
                    <span className={`text-sm font-bold tabular-nums ${availableStock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatNumber(availableStock)} kg
                    </span>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Step 2: Destination */}
          {step === 2 && (
            <div className="grid gap-2">
              <Label>Gudang Tujuan *</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih gudang tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {filteredWarehouses(resolvedFromWarehouse).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                        {w.name} <span className="text-muted-foreground text-xs">({w.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {resolvedFromWarehouse && (
                <p className="text-xs text-muted-foreground">
                  Dari: <span className="font-medium text-foreground">{fromWarehouse?.name}</span>
                </p>
              )}
            </div>
          )}

          {/* Step 3: Amount */}
          {step === 3 && (
            <>
              <div className="grid gap-2">
                <Label>Jumlah Transfer (kg) *</Label>
                <Input
                  type="number"
                  min={1}
                  max={availableStock}
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Masukkan jumlah dalam kg"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tersedia:</span>
                  <span className={`font-semibold tabular-nums ${availableStock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatNumber(availableStock)} kg
                  </span>
                </div>
              </div>

              {isOverStock && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3"
                >
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-xs text-red-700 dark:text-red-400">
                    Jumlah melebihi stok tersedia ({formatNumber(availableStock)} kg)
                  </span>
                </motion.div>
              )}

              {/* Preview card */}
              {quantity > 0 && !isOverStock && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border bg-primary/5 dark:bg-primary/10 p-4 space-y-2"
                >
                  <p className="text-xs font-medium text-muted-foreground mb-2">Ringkasan Transfer</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium">{selectedProduct?.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {selectedProduct?.type}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-muted-foreground mb-0.5">Gudang Asal</p>
                      <p className="font-medium truncate">{fromWarehouse?.name}</p>
                      <p className="text-red-600 dark:text-red-400 font-bold tabular-nums">
                        -{formatNumber(quantity)} kg
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-muted-foreground mb-0.5">Gudang Tujuan</p>
                      <p className="font-medium truncate">{toWarehouse?.name}</p>
                      <p className="text-green-600 dark:text-green-400 font-bold tabular-nums">
                        +{formatNumber(quantity)} kg
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>

        {/* Footer */}
        <DialogFooter className="flex-row gap-2 sm:justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            Kembali
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleDialogChange(false)}>
              Batal
            </Button>
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && (!resolvedFromWarehouse || !resolvedProduct)) ||
                  (step === 2 && !toWarehouseId)
                }
                className="btn-gradient"
              >
                Lanjut
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || transferMutation.isPending}
                className="btn-gradient"
              >
                {transferMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                )}
                Transfer Sekarang
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
