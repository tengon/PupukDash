'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchActivityLogs, type ActivityLog } from '@/lib/api'
import { formatDateTime, getActivityActionColor, getActivityActionLabel } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ClipboardList, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

const ACTION_FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'order', label: 'Pesanan' },
  { id: 'stock', label: 'Stok' },
  { id: 'distribution', label: 'Distribusi' },
] as const

export function ActivityLogView() {
  const { refreshKey } = useAppStore()
  const [actionFilter, setActionFilter] = useState<string>('all')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['activity-logs', actionFilter, refreshKey],
    queryFn: async () => {
      const params: { action?: string } = {}
      if (actionFilter !== 'all') params.action = actionFilter
      return fetchActivityLogs(params)
    },
  })

  const logs: ActivityLog[] = data?.logs ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Riwayat Aktivitas</h2>
          <p className="text-sm text-muted-foreground">Log Sistem</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Muat Ulang
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {ACTION_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActionFilter(filter.id)}
            className={`filter-pill ${actionFilter === filter.id ? 'active' : ''}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32 shrink-0" />
                <Skeleton className="h-6 w-24 shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="rounded-full bg-muted/50 p-4 mb-3">
              <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Belum ada aktivitas tercatat
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Aktivitas akan muncul setelah ada transaksi atau perubahan data
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-44">Waktu</TableHead>
                  <TableHead className="w-40">Aksi</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow
                    key={log.id}
                    className="group"
                  >
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                      >
                        {formatDateTime(log.createdAt)}
                      </motion.span>
                    </TableCell>
                    <TableCell>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                      >
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium ${getActivityActionColor(log.action)}`}
                        >
                          {getActivityActionLabel(log.action)}
                        </Badge>
                      </motion.div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                      >
                        {log.detail.length > 80 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm cursor-default">
                                {log.detail.slice(0, 80)}...
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-sm">
                              <p className="text-xs">{log.detail}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-sm">{log.detail}</span>
                        )}
                      </motion.div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </motion.div>
  )
}