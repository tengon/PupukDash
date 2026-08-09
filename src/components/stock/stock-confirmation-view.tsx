'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWarehouses, fetchProducts, type Warehouse } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/format'
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
import { motion } from 'framer-motion'
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Package,
  Building2,
  FileText,
  Filter,
  Check,
  ShieldCheck,
  Download,
  Boxes,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StockConfirmationItem {
  id: string
  noBeritaAcara: string
  tanggal: string
  gudang: string
  produsen: string
  produk: string
  qtySistemTon: number
  qtyFisikTon: number
  selisihTon: number
  status: 'CONFIRMED' | 'PENDING' | 'DISCREPANCY'
  petugas: string
  catatan?: string
}

const SAMPLE_CONFIRMATIONS: StockConfirmationItem[] = [
  {
    id: 'CONF-2026-001',
    noBeritaAcara: 'BA/STOK/2026/08/001',
    tanggal: '2026-08-08',
    gudang: 'Gudang Utama Pringapus',
    produsen: 'PT Pupuk Sriwidjaja',
    produk: 'UREA',
    qtySistemTon: 250,
    qtyFisikTon: 250,
    selisihTon: 0,
    status: 'CONFIRMED',
    petugas: 'Suryanto (Kepala Gudang)',
    catatan: 'Stok sesuai dengan alokasi SO PUD',
  },
  {
    id: 'CONF-2026-002',
    noBeritaAcara: 'BA/STOK/2026/08/002',
    tanggal: '2026-08-07',
    gudang: 'Gudang Penyangga Tuntang',
    produsen: 'PT Petrokimia Gresik',
    produk: 'NPK',
    qtySistemTon: 180,
    qtyFisikTon: 180,
    selisihTon: 0,
    status: 'CONFIRMED',
    petugas: 'Budi Santoso',
    catatan: 'Terverifikasi lengkap tanpa kerusakan',
  },
  {
    id: 'CONF-2026-003',
    noBeritaAcara: 'BA/STOK/2026/08/003',
    tanggal: '2026-08-06',
    gudang: 'Gudang Transit Sumowono',
    produsen: 'PT Pupuk Sriwidjaja',
    produk: 'UREA',
    qtySistemTon: 120,
    qtyFisikTon: 118.5,
    selisihTon: -1.5,
    status: 'DISCREPANCY',
    petugas: 'Herman Prasetyo',
    catatan: 'Terdapat susut 1,5 Ton dalam pengiriman armada tronton',
  },
  {
    id: 'CONF-2026-004',
    noBeritaAcara: 'BA/STOK/2026/08/004',
    tanggal: '2026-08-05',
    gudang: 'Gudang Utama Pringapus',
    produsen: 'PT Petrokimia Gresik',
    produk: 'NPK',
    qtySistemTon: 300,
    qtyFisikTon: 300,
    selisihTon: 0,
    status: 'CONFIRMED',
    petugas: 'Suryanto',
    catatan: 'Sudah disetujui tim audit distributor',
  },
  {
    id: 'CONF-2026-005',
    noBeritaAcara: 'BA/STOK/2026/08/005',
    tanggal: '2026-08-04',
    gudang: 'Gudang Penyangga Tuntang',
    produsen: 'PT Pupuk Sriwidjaja',
    produk: 'UREA',
    qtySistemTon: 95,
    qtyFisikTon: 95,
    selisihTon: 0,
    status: 'PENDING',
    petugas: 'Rahmat Hidayat',
    catatan: 'Menunggu konfirmasi penerimaan fisik dari supervisor PUD',
  },
]

export function StockConfirmationView({ reportMode = false }: { reportMode?: boolean }) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [produkFilter, setProdukFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState<'penerimaan' | 'penyaluran' | 'opname'>('penerimaan')
  const [selectedItem, setSelectedItem] = useState<StockConfirmationItem | null>(null)
  const [confirmList, setConfirmList] = useState<StockConfirmationItem[]>(SAMPLE_CONFIRMATIONS)

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: fetchWarehouses,
  })

  const filteredList = confirmList.filter((item) => {
    if (search) {
      const q = search.toLowerCase()
      const matchSearch =
        item.noBeritaAcara.toLowerCase().includes(q) ||
        item.gudang.toLowerCase().includes(q) ||
        item.petugas.toLowerCase().includes(q) ||
        item.produk.toLowerCase().includes(q)
      if (!matchSearch) return false
    }
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
    if (produkFilter !== 'ALL' && item.produk !== produkFilter) return false
    return true
  })

  const totalConfirmedTon = filteredList
    .filter((i) => i.status === 'CONFIRMED')
    .reduce((acc, curr) => acc + curr.qtyFisikTon, 0)

  const totalPendingTon = filteredList
    .filter((i) => i.status === 'PENDING')
    .reduce((acc, curr) => acc + curr.qtySistemTon, 0)

  const totalSelisihTon = filteredList.reduce((acc, curr) => acc + curr.selisihTon, 0)

  const handleApprove = (id: string) => {
    setConfirmList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'CONFIRMED',
              catatan: (item.catatan || '') + ' — Disetujui pada ' + new Date().toLocaleString('id-ID'),
            }
          : item
      )
    )
    setSelectedItem(null)
    toast({
      title: 'Konfirmasi Berhasil',
      description: `Berita Acara ${id} telah disetujui & diverifikasi stok fisik.`,
    })
  }

  const handleExport = () => {
    toast({
      title: 'Laporan Didownload',
      description: 'Laporan Konfirmasi Stok Pupuk Bersubsidi berhasil di-export ke format PDF/Excel.',
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold">
              {reportMode ? 'Laporan Rekapitulasi Konfirmasi Stok' : 'Konfirmasi & Verifikasi Stok Gudang'}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {reportMode
              ? 'Laporan resmi berita acara opname fisik, selisih stok, dan verifikasi penerimaan/penyaluran pupuk'
              : 'Verifikasi penerimaan pupuk PUD, penyaluran kios PPTS, dan berita acara opname fisik gudang'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleExport} size="sm" variant="outline" className="gap-1.5 h-9 text-xs font-semibold">
            <Download className="h-4 w-4 text-emerald-600" />
            Download Laporan
          </Button>
        </div>
      </div>

      {/* Main Container Card */}
      <Card className="border-l-2 border-l-emerald-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {reportMode ? 'Rekap Berita Acara Opname Stok (2026)' : 'Monitoring Verifikasi Stok Fisik (2026)'}
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                Resmi GOW CM
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari Berita Acara / Gudang / Petugas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-full sm:w-64 text-xs"
                />
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Dokumen Berita Acara</p>
              <p className="text-lg font-bold tabular-nums text-foreground">{filteredList.length} <span className="text-xs font-normal text-muted-foreground">dokumen</span></p>
            </div>

            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Stok Terverifikasi (Confirmed)</p>
              <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatNumber(totalConfirmedTon)} <span className="text-xs font-normal text-muted-foreground">Ton</span>
              </p>
            </div>

            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Menunggu Verifikasi (Pending)</p>
              <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                {formatNumber(totalPendingTon)} <span className="text-xs font-normal text-muted-foreground">Ton</span>
              </p>
            </div>

            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Selisih Opname Fisik</p>
              <p className={`text-sm font-bold tabular-nums mt-0.5 ${totalSelisihTon < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                {totalSelisihTon.toLocaleString('id-ID')} <span className="text-xs font-normal text-muted-foreground">Ton</span>
              </p>
            </div>
          </div>

          {/* Filter Dropdowns Bar */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2.5 pt-1 p-2.5 rounded-lg bg-background/60 border border-border/40 text-xs">
            <div className="flex items-center gap-1 font-semibold text-muted-foreground shrink-0">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span>Filter Data:</span>
            </div>

            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Dropdown Produk */}
              <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
                <span className="text-[11px] text-muted-foreground font-medium shrink-0">Produk:</span>
                <Select value={produkFilter} onValueChange={(val) => setProdukFilter(val)}>
                  <SelectTrigger className="h-8 text-xs w-full sm:w-[130px] bg-background">
                    <SelectValue placeholder="Semua Produk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Produk</SelectItem>
                    <SelectItem value="UREA">UREA</SelectItem>
                    <SelectItem value="NPK">NPK</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dropdown Status */}
              <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
                <span className="text-[11px] text-muted-foreground font-medium shrink-0">Status:</span>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                  <SelectTrigger className="h-8 text-xs w-full sm:w-[145px] bg-background">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status</SelectItem>
                    <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="DISCREPANCY">DISCREPANCY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-border/80 overflow-x-auto shadow-sm">
            <Table className="relative w-full border-collapse text-xs border border-border/60">
              <TableHeader className="bg-muted/95">
                <TableRow className="text-[11px] divide-x divide-border/60">
                  <TableHead className="font-bold text-center border border-border/60 py-2">No. Berita Acara & Tgl</TableHead>
                  <TableHead className="font-bold text-center border border-border/60 py-2">Gudang Lokasi</TableHead>
                  <TableHead className="font-bold text-center border border-border/60 py-2">Produsen & Produk</TableHead>
                  <TableHead className="font-bold text-center border border-border/60 py-2">Qty Sistem (Ton)</TableHead>
                  <TableHead className="font-bold text-center border border-border/60 py-2">Qty Fisik (Ton)</TableHead>
                  <TableHead className="font-bold text-center border border-border/60 py-2">Selisih (Ton)</TableHead>
                  <TableHead className="font-bold text-center border border-border/60 py-2">Status Verifikasi</TableHead>
                  <TableHead className="font-bold text-center border border-border/60 py-2">Petugas Pemeriksa</TableHead>
                  <TableHead className="font-bold text-center border border-border/60 py-2">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-border/60">
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground italic border border-border/60">
                      Tidak ada data konfirmasi stok yang sesuai
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((item) => {
                    let prodBadgeClass = 'bg-blue-500/10 text-blue-700 border-blue-200'
                    if (item.produk === 'UREA') prodBadgeClass = 'bg-emerald-500/10 text-emerald-700 border-emerald-300'
                    else if (item.produk === 'NPK') prodBadgeClass = 'bg-blue-500/10 text-blue-700 border-blue-300'

                    let statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    if (item.status === 'PENDING') statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300'
                    else if (item.status === 'DISCREPANCY') statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300'

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40 transition-colors text-xs divide-x divide-border/60">
                        {/* No Berita Acara & Tgl */}
                        <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2">
                          <span className="font-mono font-bold text-primary block">{item.noBeritaAcara}</span>
                          <span className="text-[10px] text-muted-foreground block">{item.tanggal}</span>
                        </TableCell>

                        {/* Gudang */}
                        <TableCell className="text-center border border-border/60 px-3 py-2 font-semibold">
                          {item.gudang}
                        </TableCell>

                        {/* Produsen & Produk */}
                        <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2">
                          <span className="text-[10px] text-muted-foreground block">{item.produsen}</span>
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${prodBadgeClass}`}>
                            {item.produk}
                          </Badge>
                        </TableCell>

                        {/* Qty Sistem */}
                        <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-mono font-semibold">
                          {item.qtySistemTon} Ton
                        </TableCell>

                        {/* Qty Fisik */}
                        <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2 font-mono font-extrabold text-foreground">
                          {item.qtyFisikTon} Ton
                        </TableCell>

                        {/* Selisih */}
                        <TableCell className={`text-center border border-border/60 whitespace-nowrap px-3 py-2 font-mono font-bold ${
                          item.selisihTon < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                        }`}>
                          {item.selisihTon === 0 ? '0 Ton' : `${item.selisihTon} Ton`}
                        </TableCell>

                        {/* Status Verifikasi */}
                        <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${statusBadgeClass}`}>
                            {item.status}
                          </Badge>
                        </TableCell>

                        {/* Petugas */}
                        <TableCell className="text-center border border-border/60 px-3 py-2 text-[11px] font-medium">
                          {item.petugas}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="text-center border border-border/60 whitespace-nowrap px-3 py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
                            onClick={() => setSelectedItem(item)}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Detail Berita Acara Konfirmasi Stok */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
              Detail Berita Acara Konfirmasi Stok
            </DialogTitle>
            <DialogDescription className="text-xs">
              No. Berita Acara: <strong className="font-mono text-primary">{selectedItem?.noBeritaAcara}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-3 text-xs pt-1">
              <div className="p-3 rounded-lg bg-muted/50 space-y-2 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lokasi Gudang:</span>
                  <span className="font-bold text-foreground">{selectedItem.gudang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produsen & Produk:</span>
                  <span className="font-bold text-foreground">{selectedItem.produsen} ({selectedItem.produk})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal Pemeriksaan:</span>
                  <span className="font-semibold text-foreground">{selectedItem.tanggal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Petugas Opname Fisik:</span>
                  <span className="font-semibold text-foreground">{selectedItem.petugas}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-background border text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Stok Sistem</span>
                  <span className="font-mono font-bold text-sm">{selectedItem.qtySistemTon} Ton</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Stok Fisik Audit</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-600">{selectedItem.qtyFisikTon} Ton</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Selisih Opname</span>
                  <span className={`font-mono font-extrabold text-sm ${selectedItem.selisihTon < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedItem.selisihTon} Ton
                  </span>
                </div>
              </div>

              {selectedItem.catatan && (
                <div className="p-2.5 rounded-lg border bg-muted/30">
                  <span className="font-semibold text-foreground block mb-0.5">Catatan Pemeriksaan:</span>
                  <p className="text-muted-foreground italic text-[11px]">{selectedItem.catatan}</p>
                </div>
              )}

              {selectedItem.status === 'PENDING' && (
                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(selectedItem.id)}
                  >
                    <Check className="h-4 w-4" />
                    Setujui & Verifikasi Stok
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
