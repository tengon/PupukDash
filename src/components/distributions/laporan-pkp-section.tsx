'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Search, RefreshCw, FileText, FileCheck, Store, Scale, ArrowUpDown, ArrowUp, ArrowDown, MapPin
} from 'lucide-react'

interface LaporanPkpRecord {
  id: string
  noPkp: string
  produsen?: string | null
  distributor?: string | null
  kodeDistributor?: string | null
  tipePenyaluran?: string | null
  noPenebusan?: string | null
  kodeSo?: string | null
  tahun?: string | null
  bulan?: string | null
  tglPenyaluran?: string | null
  provinsi?: string | null
  kabupaten?: string | null
  kecamatan?: string | null
  kodePengecer?: string | null
  pengecer?: string | null
  productName?: string | null
  produk?: string | null
  quantityTon?: number
  qtyTon?: string
  quantityKg?: number
  status?: string | null
  schemaType?: string | null
  statusIpubers?: string | null
  updatedAt?: string
}

export function LaporanPkpSection() {
  const [search, setSearch] = useState('')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<'noPkp' | 'noPenebusan' | 'pengecer' | 'kecamatan' | 'kodeSo' | 'productName' | 'quantityTon' | 'tglPenyaluran' | 'status'>('tglPenyaluran')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: resData, isLoading, refetch, isFetching } = useQuery<{ success: boolean; total: number; data: LaporanPkpRecord[] }>({
    queryKey: ['gowcm-laporan-pkp', search, districtFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (districtFilter && districtFilter !== 'all') params.set('district', districtFilter)
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter)
      const res = await fetch(`/api/gowcm/laporan-pkp?${params.toString()}`)
      if (!res.ok) throw new Error('Gagal mengambil data Laporan PKP')
      return res.json()
    },
  })

  const rawList = resData?.data || []

  // Extract unique districts
  const districtsList = Array.from(new Set(rawList.map(r => r.kecamatan).filter(Boolean))).sort()

  // Calculate summary stats
  const totalPkp = new Set(rawList.map(r => r.noPkp).filter(Boolean)).size
  const uniqueKios = new Set(rawList.map(r => r.kodePengecer || r.pengecer).filter(Boolean)).size
  const uniqueSo = new Set(rawList.map(r => r.kodeSo).filter(Boolean)).size
  const totalTon = rawList.reduce((sum, r) => {
    const ton = r.quantityTon || parseFloat(String(r.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0
    return sum + ton
  }, 0)
  const totalKg = totalTon * 1000

  // Sorting
  const sortedList = [...rawList].sort((a, b) => {
    let valA: any = a[sortField] || ''
    let valB: any = b[sortField] || ''

    if (sortField === 'quantityTon') {
      valA = a.quantityTon || parseFloat(String(a.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0
      valB = b.quantityTon || parseFloat(String(b.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0
    } else {
      valA = String(valA).toLowerCase()
      valB = String(valB).toLowerCase()
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  const renderSortIcon = (field: typeof sortField) => {
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
    { value: 'Submited', label: 'Submited' },
    { value: 'Selesai', label: 'Selesai' },
  ]

  return (
    <Card className="border-l-4 border-l-purple-600 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Laporan Item Penyaluran (Tabel No. PKP - GOW CM)
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 font-mono text-[10px]">
              GOW CM Item Penyaluran PKP
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v); setPage(1) }}>
              <SelectTrigger className="h-9 text-xs w-36 sm:w-44">
                <SelectValue placeholder="Semua Kecamatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kecamatan</SelectItem>
                {districtsList.map((d) => (
                  <SelectItem key={d} value={d}>Kec. {d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari PKP / Order / Kios / SO..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 h-9 w-full sm:w-60 text-xs"
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
              <FileCheck className="h-3 w-3 text-purple-600" /> Total No. PKP
            </p>
            <p className="text-lg font-mono font-extrabold tabular-nums mt-0.5">{totalPkp} <span className="text-xs font-normal text-muted-foreground">PKP</span></p>
          </div>
          <div className="glass rounded-xl p-3 border border-border/60 bg-muted/20">
            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Store className="h-3 w-3 text-blue-600" /> Kios PPTS Terlayani
            </p>
            <p className="text-lg font-mono font-extrabold tabular-nums mt-0.5">{uniqueKios} <span className="text-xs font-normal text-muted-foreground">Kios</span></p>
          </div>
          <div className="glass rounded-xl p-3 border border-border/60 bg-muted/20">
            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <FileCheck className="h-3 w-3 text-emerald-600" /> Total SO Terkait
            </p>
            <p className="text-lg font-mono font-extrabold tabular-nums mt-0.5">{uniqueSo} <span className="text-xs font-normal text-muted-foreground">SO</span></p>
          </div>
          <div className="glass rounded-xl p-3 border border-border/60 bg-muted/20">
            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Scale className="h-3 w-3 text-amber-600" /> Total QTY Penyaluran
            </p>
            <p className="text-lg font-mono font-extrabold tabular-nums mt-0.5">{totalTon.toLocaleString('id-ID', { maximumFractionDigits: 3 })} <span className="text-xs font-normal text-muted-foreground">Ton ({totalKg.toLocaleString('id-ID')} Kg)</span></p>
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
            <FileText className="h-12 w-12 mx-auto opacity-30" />
            <p className="text-sm font-semibold">Belum ada data Laporan Item Penyaluran PKP yang sesuai.</p>
            <p className="text-xs opacity-70">Jalankan scraper laporan_item_penyaluran_pkp.js untuk memperbarui data.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 text-xs">
                    <TableHead className="w-[150px] cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('noPkp')}>
                      <div className="flex items-center">
                        No. PKP {renderSortIcon('noPkp')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('noPenebusan')}>
                      <div className="flex items-center">
                        No. Order / Penebusan {renderSortIcon('noPenebusan')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('pengecer')}>
                      <div className="flex items-center">
                        Kios PPTS {renderSortIcon('pengecer')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('kecamatan')}>
                      <div className="flex items-center">
                        Kecamatan {renderSortIcon('kecamatan')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('kodeSo')}>
                      <div className="flex items-center">
                        Kode SO {renderSortIcon('kodeSo')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('productName')}>
                      <div className="flex items-center">
                        Produk {renderSortIcon('productName')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('quantityTon')}>
                      <div className="flex items-center justify-end">
                        QTY (Ton) {renderSortIcon('quantityTon')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none font-bold hover:text-foreground" onClick={() => handleSort('tglPenyaluran')}>
                      <div className="flex items-center">
                        Tgl. Penyaluran {renderSortIcon('tglPenyaluran')}
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
                    const pkp = item.noPkp || '-'
                    const penebusan = item.noPenebusan || '-'
                    const kios = item.pengecer || '-'
                    const kodeKios = item.kodePengecer || '-'
                    const kec = item.kecamatan || '-'
                    const so = item.kodeSo || '-'
                    const pName = item.productName || item.produk || 'UREA'
                    const ton = item.quantityTon || parseFloat(String(item.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0
                    const kg = ton * 1000
                    const tgl = item.tglPenyaluran || '-'
                    const statusText = item.status || 'Submited'

                    let badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                    if (statusText.toLowerCase().includes('selesai') || statusText.toLowerCase().includes('submited')) {
                      badgeClass = 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                    }

                    return (
                      <TableRow key={item.id || `${pkp}-${penebusan}-${idx}`} className="hover:bg-muted/40 text-xs">
                        <TableCell className="font-mono font-bold text-purple-700 dark:text-purple-400">
                          {pkp}
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-foreground">
                          {penebusan}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block">{kios}</span>
                            <span className="font-mono text-[10px] text-muted-foreground block">{kodeKios}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <MapPin className="h-3 w-3 shrink-0" />
                            Kec. {kec}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {so}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-extrabold text-xs px-2 py-0.5 bg-muted">
                            {pName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-extrabold tabular-nums text-foreground">
                          <div>
                            <span className="text-sm">{ton.toLocaleString('id-ID', { maximumFractionDigits: 3 })} Ton</span>
                            <span className="text-[10px] text-muted-foreground block font-normal">({kg.toLocaleString('id-ID')} Kg)</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {tgl}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={`text-[10px] font-extrabold px-2.5 py-0.5 ${badgeClass}`}>
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
                  Menampilkan {(safePage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(safePage * ITEMS_PER_PAGE, sortedList.length)} dari {sortedList.length} Item PKP
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
