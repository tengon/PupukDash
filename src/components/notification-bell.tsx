'use client'

import { useState } from 'react'
import { Bell, AlertTriangle, Clock, Truck, Package, CheckCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { fetchNotifications, type AppNotification } from '@/lib/api'
import { formatRelativeTime } from '@/lib/format'

const iconMap: Record<string, React.ElementType> = {
  'alert-triangle': AlertTriangle,
  clock: Clock,
  truck: Truck,
  package: Package,
}

const colorClasses: Record<string, string> = {
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
}

const borderColorClasses: Record<string, string> = {
  red: 'border-l-red-400',
  amber: 'border-l-amber-400',
  green: 'border-l-green-400',
  teal: 'border-l-teal-400',
}

const dotColorClasses: Record<string, string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  teal: 'bg-teal-500',
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: AppNotification
  onClick: () => void
}) {
  const Icon = iconMap[notification.icon] || Bell
  const colorClass = colorClasses[notification.color] || colorClasses.amber
  const borderClass = borderColorClasses[notification.color] || ''
  const dotClass = dotColorClasses[notification.color] || 'bg-amber-500'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer border-l-2 ${borderClass}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colorClass}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
          <p className="text-sm font-semibold leading-tight truncate">
            {notification.title}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/50">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </button>
  )
}

export function NotificationBell() {
  const { setActiveTab, refreshKey } = useAppStore()
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', refreshKey],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  })

  const notifications = data?.notifications ?? []
  const alertCount = notifications.length

  function handleNotificationClick(n: AppNotification) {
    setActiveTab(n.action.tab)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
          title={
            alertCount > 0
              ? `${alertCount} notifikasi`
              : 'Tidak ada notifikasi'
          }
        >
          <Bell
            className={`h-4 w-4 ${
              alertCount > 0
                ? 'text-primary bell-pulse-green'
                : 'text-muted-foreground'
            }`}
          />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 sm:w-80 w-[calc(100vw-2rem)]"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Notifikasi</h3>
              {alertCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Tandai sudah dibaca
            </Button>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Memuat notifikasi...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Tidak ada notifikasi baru
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClick={() => handleNotificationClick(n)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard')
                  setOpen(false)
                }}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors link-underline"
              >
                Lihat Semua di Dashboard →
              </button>
            </div>
          )}
        </motion.div>
      </PopoverContent>
    </Popover>
  )
}