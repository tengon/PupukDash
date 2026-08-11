'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Search, RefreshCw, ShoppingBag, FileText, Truck, Scale, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Clock, XCircle
} from 'lucide-react'

interface GowOrderRecord {
  id: string
  noPenebusan: string
  kodeReferensi?: string | null
  distributorName?: string | null
  namaDistributor?: string | null
  producerName?: string | null
  namaProdusen?: string | null
  kodeBooking?: string | null
  batasAkhir?: string | null
  tglPengambilan?: string | null
  tglRencana?: string | null
  tglOrder?: string | null
  status?: string | null
  kodeSo?: string | null
  nomorDo?: string | null
  productName?: string | null
  namaProduk?: string | null
  quantityKg?: number
  qtyKg?: string
  quantityTon?: number
  tglDo?: string | null
  tanggalDo?: string | null
  updatedAt?: string
}

export function GowCmOrderSection() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<'noPenebusan' | 'kodeSo' | 'nomorDo' | 'productName' | 'quantityKg' | 'status'>('noPenebusan')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: resData, isLoading, refetch, isFetching } = useQuery<{ success: boolean; total: number; data: GowOrderRecord[] }>({
    queryKey: ['gowcm-orders', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter)
      const res = await fetch(`/api/gowcm/orders?${params.toString()}`)
      if (!res.ok) throw new Error('Gagal mengambil data Order GOW CM')
      return res.json()
    },
  })

  const rawList = resData?.data || []

  // Calculate summary stats
  const totalOrders = rawList.length
  const totalSoCount = rawList.filter(o => o.kodeSo && o.kodeSo !== '-').length
  const totalDoCount = rawList.filter(o => o.nomorDo && o.nomorDo !== '-').length
  const totalKg = rawList.reduce((sum, o) => {
    const qty = o.quantityKg || parseFloat((o.qtyKg || '0').replace(/\./g, '').replace(',', '.')) || 0
    return sum + qty
  }, 0)
  const totalTon = totalKg / 1000

  // Sorting
  const sortedList = [...rawList].sort((a, b) => {
    let valA: any = a[sortField] || ''
    let valB: any = b[sortField] || ''

    if (sortField === 'quantityKg') {
      valA = a.quantityKg || parseFloat((a.qtyKg || '0').replace(/\./g, '').replace(',', '.')) || 0
      valB = b.quantityKg || parseFloat((b.qtyKg || '0').replace(/\./g, '').replace(',', '.')) || 0
    } else {
      valA = String(valA).toLowerCase()
      valB = String(valB).toLowerCase()
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field: 'noPenebusan' | 'kodeSo' | 'nomorDo' | 'productName' | 'quantityKg' | 'status') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const renderSortIcon = (field: 'noPenebusan' | 'kodeSo' | 'nomorDo' | 'productName' | 'quantityKg' | 'status') => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary shrink-0" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary shrink-0" />
  }

  // Pagination
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.max(1, Math.ceil(sortedList.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = sortedList.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  const statusOptions = [
    { value: 'ALL', label: 'Semua Status' },
    { value: 'Aktif', label: 'Aktif' },
    { value: 'Diterima', label: 'Diterima' },
    { value: 'Selesai', label: 'Selesai' },
    { value: 'Dibatalkan', label: 'Dibatalkan' },
  ]

  return (
    <Card className="border-l-4 border-l-blue-600 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Monitoring Order & DO (GOW CM Pupuk Indonesia)
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 font-mono text-[10px]">
              GOW CM API
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari No Penebusan / SO / DO..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 h-9 w-full sm:w-64 text-xs"
              />
            </div>
            <Button onClick={() => refetch()} size="sm" variant="outline" className="h-9 gap-1.5 shrink-0 text-xs font-bold">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <div className="glass rounded-xl p-3 border border-border/60 bg-muted/20">
            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <FileText className="h-3 w-3 text-blue-600" /> Total Penebusan (Order)
            </p>
            <p className="text-lg font-mono font-extrabold tabular-nums mt-0.5">{totalOrders} <span className="text-xs font-normal text-muted-foreground">ORD</span></p>
          </div>
          <div className="glass rounded-xl p-3 border border-border/60 bg-muted/20">
            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Total SO Terbit
            </p>
            <p className="text-lg font-mono font-extrabold tabular-nums mt-0.5">{totalSoCount} <span className="text-xs font-normal text-muted-foreground">SO</span></p>
          </div>
          <div className="glass rounded-xl p-3 border border-border/60 bg-muted/20">
            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Truck className="h-3 w-3 text-indigo-600" /> Total DO Terbit
            </p>
            <p className="text-lg font-mono font-extrabold tabular-nums mt-0.5">{totalDoCount} <span className="text-xs font-normal text-muted-foreground">DO</span></p>
          </div>
          <div className="glass rounded-xl p-3 border border-border/60 bg-muted/20">
            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Scale className="h-3 w-3 text-amber-600" /> Total Volume Order
            </p>
            <p className="text-lg font-mono font-extrabold tabular-nums mt-0.5">{totalTon.toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">Ton ({totalKg.toLocaleString('id-ID')} Kg)</span></p>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1) }}
              className={`filter-pill ${statusFilter === opt.value ? 'active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        {isLoading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : paged.length === 0 ? (
          <div className="text-center py-16 space-y-2 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto opacity-30" />
            <p className="text-sm font-semibold">Belum ada data Order / Monitoring DO yang sesuai.</p>
            <p className="text-xs opacity-70">Pastikan scraper order_combined.js telah dijalankan.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 text-xs">
                    <TableHead className="w-[180px] cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('noPenebusan')}>
                      <div className="flex items-center">
                        No. Penebusan {renderSortIcon('noPenebusan')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground">
                      Distributor & Produsen
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('kodeSo')}>
                      <div className="flex items-center">
                        Kode Booking / SO {renderSortIcon('kodeSo')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('nomorDo')}>
                      <div className="flex items-center">
                        No. DO & Tanggal {renderSortIcon('nomorDo')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('productName')}>
                      <div className="flex items-center">
                        Produk & Qty {renderSortIcon('productName')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('quantityKg')}>
                      <div className="flex items-center justify-end">
                        Volume (Kg / Ton) {renderSortIcon('quantityKg')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[110px] cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('status')}>
                      <div className="flex items-center justify-center">
                        Status {renderSortIcon('status')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((item, idx) => {
                    const dist = item.distributorName || item.namaDistributor || '-'
                    const prod = item.producerName || item.namaProdusen || '-'
                    const booking = item.kodeBooking || '-'
                    const so = item.kodeSo || '-'
                    const doNum = item.nomorDo || '-'
                    const tglDo = item.tglDo || item.tanggalDo || '-'
                    const pName = item.productName || item.namaProduk || 'UREA'
                    const qtyKg = item.quantityKg || parseFloat((item.qtyKg || '0').replace(/\./g, '').replace(',', '.')) || 0
                    const qtyTon = qtyKg > 0 ? qtyKg / 1000 : 0
                    const statusText = item.status || 'Aktif'

                    let badgeVariant: 'default' | 'outline' | 'secondary' | 'destructive' = 'secondary'
                    let badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                    if (statusText.toLowerCase().includes('selesai') || statusText.toLowerCase().includes('diterima')) {
                      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                    } else if (statusText.toLowerCase().includes('batal')) {
                      badgeClass = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300'
                    }

                    return (
                      <TableRow key={item.id || item.noPenebusan || idx} className="hover:bg-muted/40 text-xs">
                        <TableCell className="font-mono font-bold text-foreground">
                          <div className="space-y-0.5">
                            <span className="text-emerald-700 dark:text-emerald-400 block font-extrabold">{item.noPenebusan}</span>
                            {item.kodeReferensi && <span className="text-[10px] text-muted-foreground block font-normal">Ref: {item.kodeReferensi}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block">{dist}</span>
                            <span className="text-[10px] text-muted-foreground block">{prod}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          <div className="space-y-0.5">
                            <span className="block text-xs font-bold text-foreground">Booking: {booking}</span>
                            <span className="block text-[11px] text-blue-600 dark:text-blue-400 font-semibold">SO: {so}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {doNum !== '-' ? (
                            <div className="space-y-0.5">
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 text-[11px] font-extrabold px-2 py-0.5">
                                DO: {doNum}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground block">Tgl DO: {tglDo}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">- Menunggu DO -</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-extrabold text-xs px-2 py-0.5 bg-muted">
                            {pName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-extrabold tabular-nums text-foreground">
                          <div>
                            <span className="text-sm">{qtyTon.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Ton</span>
                            <span className="text-[10px] text-muted-foreground block font-normal">({qtyKg.toLocaleString('id-ID')} Kg)</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={badgeVariant} className={`text-[10px] font-extrabold px-2.5 py-0.5 ${badgeClass}`}>
                            {statusText}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground font-mono">
                  Menampilkan {(safePage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(safePage * ITEMS_PER_PAGE, sortedList.length)} dari {sortedList.length} Order GOW CM
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={safePage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="text-xs px-2 font-medium">Hal {safePage} dari {totalPages}</span>
                    </PaginationItem>
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
  )
}
