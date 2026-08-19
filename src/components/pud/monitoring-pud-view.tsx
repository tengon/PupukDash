'use client'

import { useState, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSpjbOperasional, type SpjbOperasionalItem } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { motion } from 'framer-motion'
import { Search, Warehouse, CheckCircle2, RefreshCw, Building2, Layers, TableProperties, MapPin, BarChart3, TrendingUp, Pencil } from 'lucide-react'
import { EditAlokasiDialog } from './edit-alokasi-dialog'

function parseTon(val: any): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const str = String(val).trim()
  if (!str || str === '-') return 0

  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0
  }
  if (str.includes('.')) {
    const parts = str.split('.')
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(str) || 0
    }
    return parseFloat(str.replace(/\./g, '')) || 0
  }
  return parseFloat(str) || 0
}

function getActiveIndices(headers: string[], filter: string): number[] {
  if (headers.length === 0) return []
  if (filter === 'ALL') {
    return headers.map((_, i) => i).filter(i => headers[i] !== '#')
  }

  const prodIdx = headers.findIndex(h => h.includes('Prov') || h.includes('Prod'))
  const baseIdx = prodIdx >= 0 ? prodIdx : 1
  const indices = [baseIdx]

  const monthMap: Record<string, string> = {
    JAN: 'Januari', FEB: 'Februari', MAR: 'Maret', APR: 'April',
    MEI: 'Mei', JUN: 'Juni', JUL: 'Juli', AGU: 'Agustus',
    SEP: 'September', OKT: 'Oktober', NOV: 'November', DES: 'Desember',
    TOTAL: 'Total'
  }

  const keyword = monthMap[filter] || ''
  headers.forEach((h, idx) => {
    if (idx !== baseIdx && keyword && h.includes(keyword)) {
      indices.push(idx)
    }
  })

  return indices
}

function SpjbOperasionalCard({
  item,
  onEditKecamatan,
}: {
  item: SpjbOperasionalItem
  onEditKecamatan?: (district: string) => void
}) {
  const headers = item.rawHeaders || item.detail?.alokasiTable?.headers || []
  const rows = item.rawRows || item.detail?.alokasiTable?.rows || []
  const detailPerKecamatan = item.detailPerKecamatan || []
  const [columnFilter, setColumnFilter] = useState<string>('TOTAL')

  const monthOptions = [
    { id: 'TOTAL', label: 'Total Tahunan & % Realisasi / Sisa' },
    { id: 'ALL', label: 'Semua Kolom (54 Kolom Portal)' },
    { id: 'JAN', label: 'Januari' },
    { id: 'FEB', label: 'Februari' },
    { id: 'MAR', label: 'Maret' },
    { id: 'APR', label: 'April' },
    { id: 'MEI', label: 'Mei' },
    { id: 'JUN', label: 'Juni' },
    { id: 'JUL', label: 'Juli' },
    { id: 'AGU', label: 'Agustus' },
    { id: 'SEP', label: 'September' },
    { id: 'OKT', label: 'Oktober' },
    { id: 'NOV', label: 'November' },
    { id: 'DES', label: 'Desember' },
  ]

  const activeIndices = getActiveIndices(headers, columnFilter)
  const prodColumnIdx = headers.findIndex(h => h.includes('Prov') || h.includes('Prod'))
  const baseProdIdx = prodColumnIdx >= 0 ? prodColumnIdx : 1

  const totalAlokasiIdx = headers.findIndex(h => h.toLowerCase().trim() === 'total alokasi')
  const totalSoApproveIdx = headers.findIndex(h => h.toLowerCase().trim() === 'total so approve')
  const totalSisaIdx = headers.findIndex(h => h.toLowerCase().trim() === 'total sisa')

  // Calculate overall SPJB summary for KPI card
  let overallAlokasi = 0
  let overallApprove = 0
  let overallSisa = 0

  if (detailPerKecamatan.length > 0) {
    detailPerKecamatan.forEach(d => {
      overallAlokasi += parseTon(String(d.totalAlokasi))
      overallApprove += parseTon(String(d.totalSoApprove))
      overallSisa += parseTon(String(d.totalSisa))
    })
  } else {
    rows.forEach(r => {
      const valName = r[baseProdIdx] || ''
      if (valName.toLowerCase().includes('total produk /kabupaten') || valName.toLowerCase().includes('total produk / kabupaten')) {
        if (totalAlokasiIdx >= 0) overallAlokasi += parseTon(r[totalAlokasiIdx])
        if (totalSoApproveIdx >= 0) overallApprove += parseTon(r[totalSoApproveIdx])
        if (totalSisaIdx >= 0) overallSisa += parseTon(r[totalSisaIdx])
      }
    })

    if (overallAlokasi === 0) {
      rows.forEach(r => {
        const valName = r[baseProdIdx] || ''
        if (!valName.toLowerCase().includes('total produk')) {
          if (totalAlokasiIdx >= 0) overallAlokasi += parseTon(r[totalAlokasiIdx])
          if (totalSoApproveIdx >= 0) overallApprove += parseTon(r[totalSoApproveIdx])
          if (totalSisaIdx >= 0) overallSisa += parseTon(r[totalSisaIdx])
        }
      })
    }
  }

  const overallPctApprove = overallAlokasi > 0 ? (overallApprove / overallAlokasi) * 100 : 0
  const overallPctSisa = overallAlokasi > 0 ? (overallSisa / overallAlokasi) * 100 : 0

  let lastGroupKey = ''

  return (
    <Card className="card-highlight border-t-2 border-t-emerald-500 border-l-3 hover:shadow-md transition-all duration-300 ease-out" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <CardContent className="p-4 space-y-3">
        {/* Header Kontrak SPJB PUD */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 bg-background/80 shrink-0 font-semibold">
                Tahun {item.tahun}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                {item.status || 'Active'}
              </Badge>
            </div>
            <h4 className="text-base font-bold truncate leading-snug" title={item.nomorSpjb}>
              No SPJB: {item.nomorSpjb}
            </h4>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-muted-foreground block">Produsen</span>
            <span className="text-xs font-bold text-primary truncate max-w-[220px] block" title={item.produsen}>
              {item.produsen}
            </span>
          </div>
        </div>

        {/* Info Distributor & Overall Realisasi & Sisa (%) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-background/60 border border-border/40 text-xs">
          <div className="flex items-center gap-1.5">
            <Warehouse className="h-4 w-4 text-blue-500 shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Distributor Resmi</span>
              <span className="font-bold text-foreground">{item.distributor || 'CV. ANUGERAH MAKMUR'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Total Realisasi & Sisa (%)</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground tabular-nums">{overallApprove.toLocaleString('id-ID')} Ton</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-extrabold bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {overallPctApprove.toFixed(1).replace('.', ',')}%
                </Badge>
                <span className="text-[10px] text-muted-foreground">| Sisa:</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-extrabold bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300">
                  {overallPctSisa.toFixed(1).replace('.', ',')}%
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-start sm:justify-end gap-2">
            <TableProperties className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-foreground">Filter Kolom:</span>
            <Select value={columnFilter} onValueChange={(val) => setColumnFilter(val)}>
              <SelectTrigger className="h-8 text-xs w-[190px] bg-background">
                <SelectValue placeholder="Pilih Filter Bulan" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabel Alokasi Ter-Grouping berdasarkan Kecamatan & Total */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Grouping per Kecamatan & Total Tahunan dengan Prosentase Realisasi (%) & Sisa (%)
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Menampilkan {activeIndices.length} kolom
            </span>
          </div>

          <div className="rounded-xl border border-border/80 overflow-x-auto max-h-[550px] overflow-y-auto shadow-sm">
            <Table className="relative w-full border-collapse text-xs border border-border/60">
              <TableHeader className="sticky top-0 z-30 shadow-xs">
                {rows.length === 0 && detailPerKecamatan.length > 0 ? (
                  <TableRow className="bg-muted/80 text-foreground font-bold text-xs divide-x divide-border/60">
                    <TableHead className="py-2.5 px-3">Kecamatan</TableHead>
                    <TableHead className="py-2.5 px-3 text-center">Produk</TableHead>
                    <TableHead className="py-2.5 px-3 text-center">Alokasi SPJB (Ton)</TableHead>
                    <TableHead className="py-2.5 px-3 text-center bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">Realisasi SO Approve (Ton & %)</TableHead>
                    <TableHead className="py-2.5 px-3 text-center bg-rose-500/10 text-rose-800 dark:text-rose-300">Sisa Alokasi (Ton & %)</TableHead>
                  </TableRow>
                ) : (
                  <TableRow className="text-[11px] divide-x divide-border/60">
                    {activeIndices.map((colIdx) => {
                      const headerText = headers[colIdx] || `Kolom ${colIdx}`
                      const isBaseProd = colIdx === baseProdIdx
                      const isTotalSoApprove = colIdx === totalSoApproveIdx
                      const isTotalSisa = colIdx === totalSisaIdx

                      let headerStyle = 'sticky top-0 z-30 bg-muted/95 backdrop-blur-md border-b text-center min-w-[110px]'
                      if (isBaseProd) {
                        headerStyle = 'sticky top-0 left-0 z-40 bg-background/95 dark:bg-card/95 border-r border-b shadow-sm min-w-[180px]'
                      } else if (isTotalSoApprove) {
                        headerStyle = 'sticky top-0 z-30 bg-emerald-100/90 dark:bg-emerald-950/90 backdrop-blur-md border-b text-center min-w-[155px] text-emerald-900 dark:text-emerald-200 font-extrabold'
                      } else if (isTotalSisa) {
                        headerStyle = 'sticky top-0 z-30 bg-rose-100/90 dark:bg-rose-950/90 backdrop-blur-md border-b text-center min-w-[155px] text-rose-900 dark:text-rose-200 font-extrabold'
                      }

                      return (
                        <TableHead key={colIdx} className={`font-bold whitespace-nowrap px-3 py-2 text-foreground border border-border/60 ${headerStyle}`}>
                          {isTotalSoApprove ? `${headerText} & %` : isTotalSisa ? `${headerText} & %` : headerText}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                )}
              </TableHeader>

              <TableBody className="divide-y divide-border/60">
                {rows.length === 0 ? (
                  detailPerKecamatan.length > 0 ? (
                    detailPerKecamatan.map((d, dIdx) => {
                      const alok = parseTon(String(d.totalAlokasi))
                      const real = parseTon(String(d.totalSoApprove))
                      const sisa = parseTon(String(d.totalSisa))
                      const pctReal = alok > 0 ? Math.round((real / alok) * 100) : 0
                      const pctSisa = alok > 0 ? Math.round((sisa / alok) * 100) : 0
                      const isUrea = d.produk.toLowerCase().includes('urea')

                      return (
                        <TableRow key={`kec_${dIdx}`} className="text-xs hover:bg-muted/40 transition-colors">
                          <TableCell className="font-bold text-foreground">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>{d.kecamatan}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-[10px] font-bold ${isUrea ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-blue-50 text-blue-700 border-blue-300'}`}>
                              {d.produk}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">{alok.toLocaleString('id-ID')} Ton</TableCell>
                          <TableCell className="text-center bg-emerald-500/5">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{real.toLocaleString('id-ID')} Ton</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-800 font-bold">{pctReal}%</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center bg-rose-500/5">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{sisa.toLocaleString('id-ID')} Ton</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-rose-100 text-rose-800 font-bold">{pctSisa}%</Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={activeIndices.length || 1} className="text-center py-6 text-xs text-muted-foreground italic border border-border/60">
                        Detail alokasi tabel belum tersedia
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  rows.map((row, rIdx) => {
                    const cellVal = row[baseProdIdx] || ''
                    const parts = cellVal.split(' - ')
                    const groupKey = parts.length > 1 ? parts[0].trim() : cellVal.trim()
                    const prodName = parts.length > 1 ? parts.slice(1).join(' - ').trim() : cellVal.trim()

                    const isNewGroup = groupKey !== lastGroupKey
                    if (isNewGroup) {
                      lastGroupKey = groupKey
                    }

                    const isKabTotal = groupKey.toLowerCase().includes('total produk /kabupaten') || groupKey.toLowerCase().includes('total produk / kabupaten')
                    const isProvTotal = groupKey.toLowerCase().includes('total produk / provinsi') || groupKey.toLowerCase().includes('total produk / provinsi')

                    let rowBgClass = 'hover:bg-muted/40'
                    let groupHeaderBg = 'bg-blue-500/10 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-l-4 border-l-blue-500'
                    let groupTitle = `KECAMATAN ${groupKey.toUpperCase()}`

                    if (isKabTotal) {
                      rowBgClass = 'bg-purple-500/5 dark:bg-purple-950/20 font-bold hover:bg-purple-500/10'
                      groupHeaderBg = 'bg-purple-500/15 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border-l-4 border-l-purple-600 font-extrabold'
                      groupTitle = 'TOTAL PRODUK / KABUPATEN'
                    } else if (isProvTotal) {
                      rowBgClass = 'bg-indigo-500/5 dark:bg-indigo-950/20 font-bold hover:bg-indigo-500/10'
                      groupHeaderBg = 'bg-indigo-500/15 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 border-l-4 border-l-indigo-600 font-extrabold'
                      groupTitle = 'TOTAL PRODUK / PROVINSI'
                    }

                    return (
                      <Fragment key={`row_${rIdx}`}>
                        {/* Banner Group Header Row */}
                        {isNewGroup && (
                          <TableRow className={`text-xs ${groupHeaderBg}`}>
                            <TableCell colSpan={activeIndices.length} className="py-2 px-3 border border-border/60">
                              <div className="sticky left-3 flex items-center gap-2 font-extrabold uppercase tracking-wide text-[11px] w-max">
                                {isKabTotal ? (
                                  <BarChart3 className="h-4 w-4 text-purple-600 shrink-0" />
                                ) : isProvTotal ? (
                                  <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                                ) : (
                                  <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                                )}
                                <span>{groupTitle}</span>
                                {!isKabTotal && !isProvTotal && onEditKecamatan && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="ml-2 h-5 text-[10px] font-bold gap-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs rounded-md"
                                    onClick={() => onEditKecamatan(groupKey)}
                                    title={`Edit Alokasi Tahunan untuk Kecamatan ${groupKey}`}
                                  >
                                    <Pencil className="h-3 w-3" />
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        {/* Product Data Row */}
                        <TableRow className={`text-xs transition-colors divide-x divide-border/60 ${rowBgClass}`}>
                          {activeIndices.map((colIdx) => {
                            const val = row[colIdx] || '-'
                            const isBaseProd = colIdx === baseProdIdx
                            const isTotalSoApprove = colIdx === totalSoApproveIdx
                            const isTotalSisa = colIdx === totalSisaIdx

                            if (isBaseProd) {
                              let prodBadgeClass = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200'
                              if (prodName.toLowerCase().includes('urea')) {
                                prodBadgeClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                              } else if (prodName.toLowerCase().includes('npk')) {
                                prodBadgeClass = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300'
                              } else if (prodName.toLowerCase().includes('organik')) {
                                prodBadgeClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300'
                              } else if (prodName.toLowerCase().includes('za')) {
                                prodBadgeClass = 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300'
                              }

                              return (
                                <TableCell
                                  key={colIdx}
                                  className="sticky left-0 bg-background/95 dark:bg-card/95 z-20 font-semibold border border-border/60 text-center whitespace-nowrap px-3 py-2 shadow-xs"
                                >
                                  <div className="flex justify-center items-center w-full">
                                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${prodBadgeClass}`}>
                                      {prodName}
                                    </Badge>
                                  </div>
                                </TableCell>
                              )
                            }

                            // Total SO Approve disamping Percentage (%)
                            if (isTotalSoApprove && totalAlokasiIdx >= 0) {
                              const alokVal = parseTon(row[totalAlokasiIdx])
                              const appVal = parseTon(val)
                              const pct = alokVal > 0 ? (appVal / alokVal) * 100 : 0

                              let badgeBg = 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300'
                              if (pct >= 70) badgeBg = 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                              else if (pct >= 40) badgeBg = 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-300'

                              return (
                                <TableCell key={colIdx} className="text-center tabular-nums whitespace-nowrap px-3 py-2 font-semibold border border-border/60">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-bold text-foreground">{val} Ton</span>
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-extrabold ${badgeBg}`}>
                                      {pct.toFixed(1).replace('.', ',')}%
                                    </Badge>
                                  </div>
                                </TableCell>
                              )
                            }

                            // Total Sisa disamping Percentage Sisa (%)
                            if (isTotalSisa && totalAlokasiIdx >= 0) {
                              const alokVal = parseTon(row[totalAlokasiIdx])
                              const sisaVal = parseTon(val)
                              const pctSisa = alokVal > 0 ? (sisaVal / alokVal) * 100 : 0

                              let badgeBg = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                              if (pctSisa > 50) badgeBg = 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300'
                              else if (pctSisa > 25) badgeBg = 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300'

                              return (
                                <TableCell key={colIdx} className="text-center tabular-nums whitespace-nowrap px-3 py-2 font-semibold border border-border/60">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="font-bold text-foreground">{val} Ton</span>
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-extrabold ${badgeBg}`}>
                                      {pctSisa.toFixed(1).replace('.', ',')}%
                                    </Badge>
                                  </div>
                                </TableCell>
                              )
                            }

                            const isNumber = val !== '-' && val !== ''
                            return (
                              <TableCell key={colIdx} className="text-center tabular-nums whitespace-nowrap px-3 py-2 font-semibold border border-border/60">
                                {isNumber ? `${val} Ton` : '-'}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40">
          <span className="flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Status: Active ({item.tahun})
          </span>
          <span className="font-mono text-[9px] opacity-70">GOW CM SPJB Operasional (Grouping Kecamatan, % Realisasi & % Sisa Disamping)</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function MonitoringPudView() {
  const [search, setSearch] = useState('')
  const [produsenFilter, setProdusenFilter] = useState('ALL')
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  const { data: spjbOperasionalRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['spjbOperasional', search, produsenFilter],
    queryFn: () => fetchSpjbOperasional({ search, produsen: produsenFilter }),
  })

  const handleOpenEditKecamatan = (district: string) => {
    setSelectedDistrict(district)
    setShowEditDialog(true)
  }

  const handleManualRefresh = async () => {
    setIsSyncing(true)
    try {
      await fetch('/api/gowcm/sync-spjb-operasional', { method: 'POST' })
      await refetch()
    } catch (err) {
      console.error('Failed manual sync SPJB Operasional:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const items = spjbOperasionalRes?.data || []
  const totalSpjb = spjbOperasionalRes?.total || 0
  const scrapedAt = spjbOperasionalRes?.scraped_at ? new Date(spjbOperasionalRes.scraped_at).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : '18 Agu 2026, 23.35 WIB'

  // Calculate mathematically exact totals for SPJB Operasional 2026
  let totalUreaAlok = 0
  let totalUreaReal = 0
  let totalNpkAlok = 0
  let totalNpkReal = 0

  items.forEach(item => {
    // Terima semua item (scraper baru tidak selalu punya field tahun)
    const is2026 = !item.tahun || item.tahun === '2026' || item.tahun === '2025' ||
      (item.nomorSpjb && (item.nomorSpjb.includes('2026') || item.nomorSpjb.includes('2025')))
    if (!is2026) return

    if (item.detailPerKecamatan && item.detailPerKecamatan.length > 0) {
      item.detailPerKecamatan.forEach((d: any) => {
        const prodName = (d.produk || '').toLowerCase()
        const alokVal = parseTon(String(d.totalAlokasi))
        const realVal = parseTon(String(d.totalSoApprove))

        if (prodName.includes('urea')) {
          totalUreaAlok += alokVal
          totalUreaReal += realVal
        } else if (prodName.includes('npk')) {
          totalNpkAlok += alokVal
          totalNpkReal += realVal
        }
      })
    } else {
      const rows = item.rawRows || item.detail?.alokasiTable?.rows || []
      const headers = item.rawHeaders || item.detail?.alokasiTable?.headers || []
      const totalAlokasiIdx = headers.findIndex((h: string) => h.toLowerCase().trim() === 'total alokasi')
      const totalSoApproveIdx = headers.findIndex((h: string) => h.toLowerCase().trim() === 'total so approve')

      rows.forEach((r: string[]) => {
        const prodName = (r[1] || r[0] || '').toLowerCase()
        if (prodName.includes('total')) return

        const alokVal = totalAlokasiIdx >= 0 ? parseTon(r[totalAlokasiIdx]) : 0
        const realVal = totalSoApproveIdx >= 0 ? parseTon(r[totalSoApproveIdx]) : 0

        if (prodName.includes('urea')) {
          totalUreaAlok += alokVal
          totalUreaReal += realVal
        } else if (prodName.includes('npk')) {
          totalNpkAlok += alokVal
          totalNpkReal += realVal
        }
      })
    }
  })

  const grandAlok = totalUreaAlok + totalNpkAlok
  const grandReal = totalUreaReal + totalNpkReal
  const grandPct = grandAlok > 0 ? ((grandReal / grandAlok) * 100).toFixed(1) : '0'
  const ureaPct = totalUreaAlok > 0 ? ((totalUreaReal / totalUreaAlok) * 100).toFixed(1) : '0'
  const npkPct = totalNpkAlok > 0 ? ((totalNpkReal / totalNpkAlok) * 100).toFixed(1) : '0'

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
      <Card className="border-l-2 border-l-emerald-500" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Monitoring PUD (SPJB Operasional Distributor)
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Tahun 2026
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                <span>🕒 Terakhir Update Scraper:</span>
                <strong className="font-semibold text-foreground">{scrapedAt} WIB</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No SPJB / Kecamatan / Produsen..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-full sm:w-64"
                />
              </div>
              <Button onClick={() => { setSelectedDistrict(''); setShowEditDialog(true) }} size="sm" className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0">
                <Pencil className="h-3.5 w-3.5" />
                Edit Alokasi
              </Button>
              <Button onClick={handleManualRefresh} disabled={isFetching || isSyncing} size="sm" variant="outline" className="h-9 gap-1.5 shrink-0 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isFetching || isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Memutakhirkan...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
            <div className="glass rounded-xl p-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Distributor PUD</p>
              <p className="text-sm font-bold truncate">CV. ANUGERAH MAKMUR</p>
              <span className="text-[10px] text-muted-foreground">Status: Active ({totalSpjb} Kontrak 2026)</span>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Alokasi & Realisasi Urea</p>
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 font-bold">{ureaPct}%</Badge>
              </div>
              <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalUreaReal.toLocaleString('id-ID')} <span className="text-xs font-normal text-muted-foreground">/ {totalUreaAlok.toLocaleString('id-ID')} Ton</span>
              </p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Alokasi & Realisasi NPK</p>
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 font-bold">{npkPct}%</Badge>
              </div>
              <p className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
                {totalNpkReal.toLocaleString('id-ID')} <span className="text-xs font-normal text-muted-foreground">/ {totalNpkAlok.toLocaleString('id-ID')} Ton</span>
              </p>
            </div>
            <div className="glass rounded-xl p-3 border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Akumulasi Realisasi</p>
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-50 text-purple-700 font-bold">{grandPct}%</Badge>
              </div>
              <p className="text-sm font-bold tabular-nums text-primary mt-0.5">
                {grandReal.toLocaleString('id-ID')} <span className="text-xs font-normal text-muted-foreground">/ {grandAlok.toLocaleString('id-ID')} Ton</span>
              </p>
            </div>
          </div>

          {/* Dropdown Produsen Filter */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-muted-foreground">Filter Produsen:</span>
            <Select value={produsenFilter} onValueChange={(val) => setProdusenFilter(val)}>
              <SelectTrigger className="h-8 text-xs w-[180px] bg-background">
                <SelectValue placeholder="Pilih Produsen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Produsen</SelectItem>
                <SelectItem value="Pupuk Sriwidjaja">Pupuk Sriwidjaja</SelectItem>
                <SelectItem value="Petrokimia Gresik">Petrokimia Gresik</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Warehouse className="h-12 w-12 opacity-30 mb-3" />
              <p className="text-sm font-medium">Belum ada data SPJB Operasional PUD yang sesuai</p>
              <p className="text-xs opacity-70 mt-1">Pastikan scraper spjb_operasional.js sudah pernah dijalankan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => (
                <SpjbOperasionalCard key={`${item.nomorSpjb}_${idx}`} item={item} onEditKecamatan={handleOpenEditKecamatan} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditAlokasiDialog open={showEditDialog} onOpenChange={setShowEditDialog} initialSearch={selectedDistrict} />
    </motion.div>
  )
}
