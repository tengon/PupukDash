'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import {
  fetchDistributions, createDistribution, updateDistribution, deleteDistribution,
  fetchWarehouses, fetchProducts, fetchGowcmPenyaluran,
  type Distribution, type GowcmPenyaluranItem,
} from '@/lib/api'
import { formatNumber, formatDate, getStatusLabel } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { motion } from 'framer-motion'
import { Plus, Truck, Package, Store, RefreshCw, Layers, ShieldCheck, ShoppingCart, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ITEMS_PER_PAGE = 10

interface FlatPenyaluranRow {
  id: string
  orderNo: string
  tanggalOrder: string
  namaPengecer: string
  kodePengecer: string
  kecamatan: string
  produk: string
  noPkp: string
  kodeSo: string
  qtyTon: string
  qtyNum: number
  statusOrder: string
  pembayaran: string
  rawOrder: GowcmPenyaluranItem
}

export function DistributionsView() {
  const { refreshKey, triggerRefresh } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [activeMainTab, setActiveMainTab] = useState<'gowcm' | 'internal'>('gowcm')

  // GOW CM Penyaluran filters & page & sorting
  const [gowcmSearch, setGowcmSearch] = useState('')
  const [gowcmStatusFilter, setGowcmStatusFilter] = useState('ALL')
  const [gowcmKecamatanFilter, setGowcmKecamatanFilter] = useState('ALL')
  const [gowcmProdukFilter, setGowcmProdukFilter] = useState('ALL')
  const [gowcmPage, setGowcmPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<GowcmPenyaluranItem | null>(null)

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Internal distribution state
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formWarehouse, setFormWarehouse] = useState('')
  const [formProduct, setFormProduct] = useState('')
  const [formQty, setFormQty] = useState(0)
  const [formVillage, setFormVillage] = useState('')
  const [formGroup, setFormGroup] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [page, setPage] = useState(1)

  // Queries
  const { data: gowcmRes, isLoading: isGowcmLoading, refetch: refetchGowcm, isFetching: isGowcmFetching } = useQuery({
    queryKey: ['gowcmPenyaluran', gowcmSearch],
    queryFn: () => fetchGowcmPenyaluran({ search: gowcmSearch }),
  })

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

  const gowcmRawOrders = gowcmRes?.data || []
  const gowcmUpdatedAt = gowcmRes?.updated_at ? new Date(gowcmRes.updated_at).toLocaleString('id-ID') : '-'

  // Flatten raw orders into individual rows
  const allFlatRows = useMemo<FlatPenyaluranRow[]>(() => {
    const list: FlatPenyaluranRow[] = []
    gowcmRawOrders.forEach((ord, ordIdx) => {
      const pemenuhanItems = (ord.detailPemenuhan && ord.detailPemenuhan.length > 0)
        ? ord.detailPemenuhan
        : [{ noPkp: '-', kodeSo: '-', produk: 'UREA', qtyTon: ord.nilaiOrderRupiah || '0', status: ord.statusOrder }]

      pemenuhanItems.forEach((p, pIdx) => {
        const qtyNum = parseFloat((p.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0
        list.push({
          id: `${ord.nomorOrder}_${ordIdx}_${pIdx}`,
          orderNo: ord.nomorOrder || '-',
          tanggalOrder: ord.tanggalOrder || '-',
          namaPengecer: ord.namaPengecer || '-',
          kodePengecer: ord.kodePengecer || '-',
          kecamatan: ord.kecamatan || '-',
          produk: (p.produk || '-').toUpperCase(),
          noPkp: p.noPkp || '-',
          kodeSo: p.kodeSo || '-',
          qtyTon: p.qtyTon || '0',
          qtyNum,
          statusOrder: (ord.statusOrder || '-').toUpperCase(),
          pembayaran: ord.pembayaran || '-',
          rawOrder: ord,
        })
      })
    })
    return list
  }, [gowcmRawOrders])

  // Filter flat rows directly
  const filteredFlatRows = useMemo(() => {
    return allFlatRows.filter((r) => {
      // Kecamatan Filter
      if (gowcmKecamatanFilter !== 'ALL' && !r.kecamatan.toLowerCase().includes(gowcmKecamatanFilter.toLowerCase())) {
        return false
      }
      // Produk Filter
      if (gowcmProdukFilter !== 'ALL' && !r.produk.toLowerCase().includes(gowcmProdukFilter.toLowerCase())) {
        return false
      }
      // Status Filter
      if (gowcmStatusFilter !== 'ALL' && r.statusOrder.toUpperCase() !== gowcmStatusFilter.toUpperCase()) {
        return false
      }
      return true
    })
  }, [allFlatRows, gowcmKecamatanFilter, gowcmProdukFilter, gowcmStatusFilter])

  // Sort flat rows
  const sortedFlatRows = useMemo(() => {
    if (!sortField) return filteredFlatRows

    return [...filteredFlatRows].sort((a, b) => {
      const valA = (a as any)[sortField]
      const valB = (b as any)[sortField]

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA
      }

      const strA = String(valA || '').toLowerCase()
      const strB = String(valB || '').toLowerCase()

      if (strA < strB) return sortDirection === 'asc' ? -1 : 1
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredFlatRows, sortField, sortDirection])

  // Calculate totals from filtered rows
  let totalPenyaluranTon = 0
  let totalUreaPenyaluranTon = 0
  let totalNpkPenyaluranTon = 0

  filteredFlatRows.forEach(r => {
    totalPenyaluranTon += r.qtyNum
    if (r.produk.includes('UREA')) {
      totalUreaPenyaluranTon += r.qtyNum
    } else if (r.produk.includes('NPK')) {
      totalNpkPenyaluranTon += r.qtyNum
    }
  })

  const GOWCM_PER_PAGE = 10
  const gowcmTotalPages = Math.max(1, Math.ceil(sortedFlatRows.length / GOWCM_PER_PAGE))
  const safeGowcmPage = Math.min(gowcmPage, gowcmTotalPages)
  const pagedFlatRows = sortedFlatRows.slice((safeGowcmPage - 1) * GOWCM_PER_PAGE, safeGowcmPage * GOWCM_PER_PAGE)

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderSortHeader = (label: string, field: string) => {
    const isSorted = sortField === field
    return (
      <TableHead
        onClick={() => handleSort(field)}
        className="font-bold text-center border border-border/60 py-2 cursor-pointer hover:bg-muted/80 transition-colors select-none group"
      >
        <div className="flex items-center justify-center gap-1">
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0 font-bold" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0 font-bold" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 shrink-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </TableHead>
    )
  }

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

  const resetForm = () => {
    setFormWarehouse('')
    setFormProduct('')
    setFormQty(0)
    setFormVillage('')
    setFormGroup('')
    setFormNotes('')
  }

  const filteredDistributions = distributions?.filter((d) => statusFilter === 'all' || d.status === statusFilter) || []
  const totalPages = Math.max(1, Math.ceil(filteredDistributions.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pagedDistributions = filteredDistributions.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* Header View & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Data Penyaluran & Distribusi Pupuk</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor penyaluran resmi order Kios PPTS dari GOW CM & pengiriman distribusi internal
          </p>
        </div>

        <Tabs value={activeMainTab} onValueChange={(val) => setActiveMainTab(val as 'gowcm' | 'internal')}>
          <TabsList className="grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="gowcm" className="gap-1.5 text-xs font-bold">
              <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
              Penyaluran GOW CM ({sortedFlatRows.length})
            </TabsTrigger>
            <TabsTrigger value="internal" className="gap-1.5 text-xs font-bold">
              <Truck className="h-3.5 w-3.5 text-blue-600" />
              Distribusi Internal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* SECTION 1: PENYALURAN GOW CM TERINTEGRASI */}
      {activeMainTab === 'gowcm' && (
        <Card className="border-l-2 border-l-emerald-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader className="pb-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Data Penyaluran Order Kios (GOW CM Terintegrasi)
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Resmi GOW CM
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari No Order / Kios / PKP / SO..."
                    value={gowcmSearch}
                    onChange={(e) => { setGowcmSearch(e.target.value); setGowcmPage(1) }}
                    className="pl-9 h-9 w-full sm:w-64"
                  />
                </div>
                <Button onClick={() => refetchGowcm()} size="sm" variant="outline" className="h-9 gap-1 shrink-0">
                  <RefreshCw className={`h-3.5 w-3.5 ${isGowcmFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* KPI Summary Cards for Penyaluran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="glass rounded-xl p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Baris Penyaluran</p>
                <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{sortedFlatRows.length} <span className="text-xs font-normal text-muted-foreground">item</span></p>
              </div>
              <div className="glass rounded-xl p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Akumulasi Tonase Penyaluran</p>
                <p className="text-sm font-bold tabular-nums text-primary mt-0.5">{formatNumber(totalPenyaluranTon)} <span className="text-xs font-normal text-muted-foreground">Ton</span></p>
              </div>
              <div className="glass rounded-xl p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Urea / NPK Tertebus</p>
                <p className="text-xs font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-1">
                  Urea: {formatNumber(totalUreaPenyaluranTon)} Ton | NPK: {formatNumber(totalNpkPenyaluranTon)} Ton
                </p>
              </div>
              <div className="glass rounded-xl p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Update Terakhir</p>
                <p className="text-xs font-semibold truncate mt-1 text-muted-foreground">{gowcmUpdatedAt}</p>
              </div>
            </div>

            {/* Filter Bar Dropdowns */}
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2.5 pt-1 p-2.5 rounded-lg bg-background/60 border border-border/40 text-xs">
              <div className="flex items-center gap-1 font-semibold text-muted-foreground shrink-0">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <span>Filter Dropdown:</span>
              </div>

              <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Dropdown Kecamatan */}
                <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
                  <span className="text-[11px] text-muted-foreground font-medium shrink-0">Kecamatan:</span>
                  <Select
                    value={gowcmKecamatanFilter}
                    onValueChange={(val) => { setGowcmKecamatanFilter(val); setGowcmPage(1) }}
                  >
                    <SelectTrigger className="h-8 text-xs w-full sm:w-[145px] bg-background">
                      <SelectValue placeholder="Pilih Kecamatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Kecamatan</SelectItem>
                      <SelectItem value="Pringapus">Pringapus</SelectItem>
                      <SelectItem value="Tuntang">Tuntang</SelectItem>
                      <SelectItem value="Sumowono">Sumowono</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dropdown Produk */}
                <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
                  <span className="text-[11px] text-muted-foreground font-medium shrink-0">Produk:</span>
                  <Select
                    value={gowcmProdukFilter}
                    onValueChange={(val) => { setGowcmProdukFilter(val); setGowcmPage(1) }}
                  >
                    <SelectTrigger className="h-8 text-xs w-full sm:w-[130px] bg-background">
                      <SelectValue placeholder="Pilih Produk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Produk</SelectItem>
                      <SelectItem value="UREA">UREA</SelectItem>
                      <SelectItem value="NPK">NPK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dropdown Status Sesuai Data Real GOW CM */}
                <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
                  <span className="text-[11px] text-muted-foreground font-medium shrink-0">Status:</span>
                  <Select
                    value={gowcmStatusFilter}
                    onValueChange={(val) => { setGowcmStatusFilter(val); setGowcmPage(1) }}
                  >
                    <SelectTrigger className="h-8 text-xs w-full sm:w-[145px] bg-background">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Status</SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                      <SelectItem value="ON PROCESS">ON PROCESS</SelectItem>
                      <SelectItem value="APPROVED">APPROVED</SelectItem>
                      <SelectItem value="SUBMITTED">SUBMITTED</SelectItem>
                      <SelectItem value="CANCELED">CANCELED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Indikator Reset Sort jika ada */}
              {sortField && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setSortField(null); setSortDirection('asc') }}
                  className="h-8 text-[11px] text-muted-foreground gap-1 px-2"
                >
                  Reset Sort ({sortField})
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {isGowcmLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : sortedFlatRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm font-medium">Belum ada data penyaluran GOW CM yang sesuai filter</p>
                <p className="text-xs opacity-70 mt-1">Coba ubah kata kunci atau pilihan dropdown filter di atas</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/80 overflow-x-auto shadow-sm max-h-[550px] overflow-y-auto">
                  <Table className="relative w-full border-collapse text-xs border border-border/60">
                    <TableHeader className="sticky top-0 bg-muted/95 z-20 shadow-xs">
                      <TableRow className="text-[11px] divide-x divide-border/60">
                        {renderSortHeader('Order No', 'orderNo')}
                        {renderSortHeader('Tanggal Order', 'tanggalOrder')}
                        {renderSortHeader('Pengecer (PPTS)', 'namaPengecer')}
                        {renderSortHeader('Kecamatan', 'kecamatan')}
                        {renderSortHeader('Produk', 'produk')}
                        {renderSortHeader('No PKP', 'noPkp')}
                        {renderSortHeader('Kode SO', 'kodeSo')}
                        {renderSortHeader('Qty (Ton)', 'qtyNum')}
                        {renderSortHeader('Status Penyaluran', 'statusOrder')}
                        <TableHead className="font-bold text-center border border-border/60 py-2">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-border/60">
                      {pagedFlatRows.map((r) => {
                        let prodBadgeClass = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200'
                        if (r.produk.includes('UREA')) {
                          prodBadgeClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                        } else if (r.produk.includes('NPK')) {
                          prodBadgeClass = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300'
                        }

                        let statusBadgeClass = 'bg-blue-100 text-blue-700 border-blue-300'
                        if (r.statusOrder === 'COMPLETED') {
                          statusBadgeClass = 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        } else if (r.statusOrder === 'ON PROCESS') {
                          statusBadgeClass = 'bg-amber-100 text-amber-700 border-amber-300'
                        } else if (r.statusOrder === 'CANCELED') {
                          statusBadgeClass = 'bg-red-100 text-red-700 border-red-300'
                        }

                        return (
                          <TableRow key={r.id} className="hover:bg-muted/40 transition-colors text-xs divide-x divide-border/60">
                            {/* Order No (Kolom 1) */}
                            <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-mono font-bold text-primary">
                              {r.orderNo}
                            </TableCell>

                            {/* Tanggal Order (Kolom 2) */}
                            <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-medium text-[11px]">
                              {r.tanggalOrder}
                            </TableCell>

                            {/* Pengecer (PPTS) - Tanpa Id PPTS */}
                            <TableCell className="text-center border border-border/60 px-3 py-2">
                              <span className="font-bold text-foreground block truncate max-w-[170px] mx-auto" title={r.namaPengecer}>
                                {r.namaPengecer}
                              </span>
                            </TableCell>

                            {/* Kecamatan */}
                            <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-semibold text-foreground">
                              {r.kecamatan}
                            </TableCell>

                            {/* Produk */}
                            <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2">
                              <div className="flex justify-center items-center w-full">
                                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${prodBadgeClass}`}>
                                  {r.produk}
                                </Badge>
                              </div>
                            </TableCell>

                            {/* No PKP */}
                            <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-mono text-[11px] font-medium text-foreground">
                              {r.noPkp}
                            </TableCell>

                            {/* Kode SO */}
                            <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-mono font-bold text-foreground">
                              {r.kodeSo}
                            </TableCell>

                            {/* Qty (Ton) */}
                            <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-bold tabular-nums text-foreground">
                              {r.qtyTon} Ton
                            </TableCell>

                            {/* Status Penyaluran */}
                            <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-bold">
                              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${statusBadgeClass}`}>
                                {r.statusOrder}
                              </Badge>
                            </TableCell>

                            {/* Aksi */}
                            <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2">
                              <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold gap-1 text-primary hover:bg-primary/10" onClick={() => setSelectedOrder(r.rawOrder)}>
                                <Layers className="h-3.5 w-3.5" />
                                Detail
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {gowcmTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Menampilkan {(safeGowcmPage - 1) * GOWCM_PER_PAGE + 1} - {Math.min(safeGowcmPage * GOWCM_PER_PAGE, sortedFlatRows.length)} dari {sortedFlatRows.length} baris penyaluran
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious onClick={() => setGowcmPage((p) => Math.max(1, p - 1))} className={safeGowcmPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="text-xs px-2 font-medium">Hal {safeGowcmPage} dari {gowcmTotalPages}</span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext onClick={() => setGowcmPage((p) => Math.min(gowcmTotalPages, p + 1))} className={safeGowcmPage >= gowcmTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: DISTRIBUSI INTERNAL GUDANG */}
      {activeMainTab === 'internal' && (
        <Card className="border-l-2 border-l-blue-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Pengiriman Distribusi Internal Gudang
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Kelola jadwal & riwayat pengiriman stok internal ke lokasi/kelompok tani</p>
              </div>
              <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm" className="gap-1.5 shadow-xs">
                <Plus className="h-4 w-4" />
                Buat Distribusi Baru
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : pagedDistributions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Truck className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm font-medium">Belum ada data distribusi internal</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 overflow-x-auto shadow-sm">
                <Table className="relative w-full border-collapse text-xs border border-border/60">
                  <TableHeader className="bg-muted/95">
                    <TableRow className="text-[11px] divide-x divide-border/60">
                      <TableHead className="font-bold text-center border border-border/60 py-2">No Distribusi & Tanggal</TableHead>
                      <TableHead className="font-bold text-center border border-border/60 py-2">Gudang Asal</TableHead>
                      <TableHead className="font-bold text-center border border-border/60 py-2">Produk & Jumlah</TableHead>
                      <TableHead className="font-bold text-center border border-border/60 py-2">Tujuan Pengiriman</TableHead>
                      <TableHead className="font-bold text-center border border-border/60 py-2">Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="divide-y divide-border/60">
                    {pagedDistributions.map((d) => (
                      <TableRow key={d.id} className="hover:bg-muted/40 transition-colors text-xs divide-x divide-border/60">
                        <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-medium">
                          <span className="font-mono font-bold text-primary block">{d.distributionNo}</span>
                          <span className="text-[10px] text-muted-foreground block">{formatDate(d.createdAt)}</span>
                        </TableCell>
                        <TableCell className="text-center border border-border/60 px-3 py-2 font-medium">{d.warehouse?.name || '-'}</TableCell>
                        <TableCell className="text-center border border-border/60 px-3 py-2 font-bold">{d.productName}: {formatNumber(d.quantity)} Ton</TableCell>
                        <TableCell className="text-center border border-border/60 px-3 py-2 font-medium">{d.targetVillage || d.targetGroup || '-'}</TableCell>
                        <TableCell className="text-center border border-border/60 px-3 py-2 font-bold">
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold bg-blue-50 text-blue-700 border-blue-200">{getStatusLabel(d.status)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DIALOG DETAIL ORDER GOW CM */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              Detail Penyaluran Order GOW CM
            </DialogTitle>
            <DialogDescription className="text-xs">
              No Order: <strong className="font-mono text-primary">{selectedOrder?.nomorOrder}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-3 text-xs pt-1">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1.5 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kios Pengecer:</span>
                  <span className="font-bold text-foreground">{selectedOrder.namaPengecer} ({selectedOrder.kodePengecer})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wilayah:</span>
                  <span className="font-semibold text-foreground">{selectedOrder.kecamatan}, {selectedOrder.kabupatenKota}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal Order:</span>
                  <span className="font-semibold text-foreground">{selectedOrder.tanggalOrder || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pembayaran:</span>
                  <span className="font-semibold text-foreground">{selectedOrder.pembayaran || '-'}</span>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-foreground mb-1.5">Rincian SO & PKP Penyaluran:</h5>
                {(selectedOrder.detailPemenuhan || []).length === 0 ? (
                  <p className="text-muted-foreground italic">Belum ada data pemenuhan SO/PKP</p>
                ) : (
                  <div className="space-y-1.5">
                    {(selectedOrder.detailPemenuhan || []).map((p, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border bg-background flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px] font-bold">{p.produk}</Badge>
                            <span className="font-mono font-bold text-xs">SO: {p.kodeSo}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block">No PKP: {p.noPkp || '-'} | Tgl: {p.tanggalPenyaluran || '-'}</span>
                        </div>
                        <span className="font-extrabold text-sm tabular-nums text-primary">{p.qtyTon} Ton</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}