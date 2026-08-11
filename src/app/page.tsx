'use client'

import { useAppStore } from '@/lib/store'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { ProductsView } from '@/components/products/products-view'
import { FarmersView } from '@/components/farmers/farmers-view'
import { PptsView } from '@/components/ppts/ppts-view'
import { MonitoringPptsView } from '@/components/ppts/monitoring-ppts-view'
import { MonitoringPudView } from '@/components/pud/monitoring-pud-view'
import { WarehousesView } from '@/components/warehouses/warehouses-view'
import { StockView } from '@/components/stock/stock-view'
import { DistributionsView } from '@/components/distributions/distributions-view'
import { OrdersView } from '@/components/orders/orders-view'
import { PurchasesView } from '@/components/purchases/purchases-view'
import { StockConfirmationView } from '@/components/stock/stock-confirmation-view'
import { RPKPView } from '@/components/rpkp/rpkp-view'
import { ReportsView } from '@/components/reports/reports-view'
import { ActivityLogView } from '@/components/activity/activity-log-view'
import { LoginView } from '@/components/auth/login-view'
import { CommandPalette } from '@/components/command-palette'
import { seedData, clearData } from '@/lib/api'
import { Leaf, Database, Clock, Trash2, LogOut, RefreshCw } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notification-bell'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient, useQuery } from '@tanstack/react-query'

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Dashboard', description: 'Ringkasan data penjualan pupuk bersubsidi' },
  products: { title: 'Produk Pupuk', description: 'Kelola data produk pupuk bersubsidi' },
  farmers: { title: 'Data Petani', description: 'Kelola data petani penerima pupuk bersubsidi' },
  ppts: { title: 'PPTS (Kios Pengecer)', description: 'Kelola data Pos Penyalur Pupuk Terdaftar & Bersubsidi' },
  allocation: { title: 'Data Alokasi', description: 'Kelola dan monitor alokasi pupuk bersubsidi SPJB Operasional & SPJB PPTS' },
  'monitoring-ppts': { title: 'Monitoring PPTS', description: 'Monitor alokasi SPJB dan realisasi tebusan pupuk bersubsidi per Kios PPTS' },
  'monitoring-pud': { title: 'Monitoring PUD', description: 'Monitor SPJB Operasional Distributor PUD dan Alokasi Bulanan dari Produsen' },
  'monitoring-order': { title: 'Monitoring Order & DO', description: 'Monitor data order penebusan dan Delivery Order (DO) dari GOW CM Pupuk Indonesia' },
  warehouses: { title: 'Gudang', description: 'Kelola data gudang penyimpanan pupuk' },
  'monitoring-warehouses': { title: 'Gudang', description: 'Monitoring data gudang penyimpanan pupuk' },
  stock: { title: 'Stok Gudang', description: 'Monitor dan kelola stok pupuk di setiap gudang' },
  'stock-confirmation': { title: 'Konfirmasi Stok', description: 'Verifikasi dan berita acara penerimaan & penyaluran stok pupuk' },
  'stock-confirmation-report': { title: 'Laporan Konfirmasi Stok', description: 'Rekapitulasi dan berita acara opname konfirmasi stok pupuk bersubsidi' },
  distributions: { title: 'Distribusi', description: 'Kelola distribusi pupuk ke kelompok tani' },
  orders: { title: 'Penjualan (ke PPTS)', description: 'Kelola pesanan penjualan pupuk ke Kios PPTS' },
  purchases: { title: 'Pembelian (dari Supplier)', description: 'Pencatatan pasokan pupuk masuk dari PT Pupuk Indonesia / Produsen' },
  rpkp: { title: 'RPKP', description: 'Rencana Kebutuhan Pupuk — Perencanaan alokasi tahunan' },
  reports: { title: 'Laporan', description: 'Laporan bulanan penjualan pupuk bersubsidi' },
  activity: { title: 'Aktivitas', description: 'Riwayat aktivitas sistem penjualan pupuk' },
}

function useWIBClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' WIB',
      )
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [])

  return time
}

export default function HomePage() {
  const { activeTab, triggerShortcut, refreshKey, setCommandPaletteOpen, isAuthenticated, user, logout } = useAppStore()
  const { toast } = useToast()
  const [isSeeding, setIsSeeding] = useState(false)
  const wibTime = useWIBClock()
  const { data: scraperStatus } = useQuery({
    queryKey: ['scraper-sync-status'],
    queryFn: async () => {
      const res = await fetch('/api/scraper/sync')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 30000,
  })

  const lastUpdateText = useMemo(() => {
    if (!scraperStatus?.lastSyncTime) return '06:00 WIB'
    const t = scraperStatus.lastSyncTime
    if (t.includes('WIB')) return t
    try {
      return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    } catch {
      return t
    }
  }, [scraperStatus])

  const pageInfo = PAGE_TITLES[activeTab] || PAGE_TITLES.dashboard

  const queryClient = useQueryClient()
  const [isClearing, setIsClearing] = useState(false)

  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const result = await seedData()
      toast({ title: 'Berhasil', description: result.message })
      queryClient.invalidateQueries()
    } catch {
      toast({ title: 'Info', description: 'Data sample sudah ada atau gagal memuat', variant: 'destructive' })
    } finally {
      setIsSeeding(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('Apakah Anda yakin ingin mengosongkan seluruh isi database?')) return
    setIsClearing(true)
    try {
      const result = await clearData()
      toast({ title: 'Database Dikondisikan', description: result.message })
      queryClient.invalidateQueries()
    } catch {
      toast({ title: 'Gagal', description: 'Gagal mengosongkan database', variant: 'destructive' })
    } finally {
      setIsClearing(false)
    }
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) {
        return
      }

      // Ignore if a dialog is open (Radix sets data-state="open") — but allow Ctrl+K
      if (document.querySelector('[data-state="open"]')) {
        if (!(e.ctrlKey || e.metaKey) || e.key !== 'k') {
          return
        }
      }

      // Ctrl+K / Cmd+K → open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
        return
      }

      // N → create new order (switch to orders tab & trigger action)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        useAppStore.getState().setActiveTab('orders')
        triggerShortcut('create-order')
        return
      }

      // / → focus search
      if (e.key === '/') {
        e.preventDefault()
        triggerShortcut('focus-search')
        // Also try to find the visible search input directly
        const searchInputs = document.querySelectorAll<HTMLInputElement>('input[placeholder*="Cari"]')
        for (const input of searchInputs) {
          if (input.offsetParent !== null) {
            input.focus()
            break
          }
        }
        return
      }
    },
    [triggerShortcut, setCommandPaletteOpen],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isAuthenticated) {
    return <LoginView />
  }

  return (
    <SidebarProvider defaultOpen={false}>
      {/* Thin green accent bar at the very top */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 z-[100]" />
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-1.5 px-3 sm:gap-2 sm:px-4 glass sticky top-0 z-10 header-gradient" style={{ borderBottom: '1px solid transparent', backgroundImage: 'linear-gradient(to bottom, var(--background), var(--background)), linear-gradient(to right, oklch(0.65 0.15 150 / 0.2), oklch(0.55 0.10 145 / 0.15), oklch(0.65 0.12 160 / 0.2))', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', borderBottomWidth: '1px', borderBottomStyle: 'solid', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Leaf className="h-4 w-4 text-primary hidden sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-tight">{pageInfo.title}</h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">{pageInfo.description}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationBell />
            
            {/* WIB Clock & Last Scraper Update Info */}
            {wibTime && (
              <div className="hidden md:flex flex-col items-end text-right justify-center mr-1">
                <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-mono tabular-nums">{wibTime}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground leading-tight mt-0.5">
                  <RefreshCw className="h-2.5 w-2.5 text-emerald-500" />
                  <span>Update: {lastUpdateText}</span>
                </div>
              </div>
            )}

            {/* User Profile & Logout Button */}
            {user && (
              <div className="flex items-center gap-2 border-l border-border/50 pl-2">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold leading-tight">{user.name}</span>
                  <span className="text-[10px] text-muted-foreground">{user.role}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                  onClick={logout}
                  title="Keluar / Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto relative">
          {activeTab === 'dashboard' && (
            <img
              src="/images/sipupuk-icon.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 h-full w-full object-contain opacity-[0.06] dark:opacity-[0.10] p-12"
            />
          )}
          {activeTab === 'orders' && (
            <img
              src="/images/ppts.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 h-full w-full object-contain opacity-[0.08] dark:opacity-[0.12]"
            />
          )}
          {activeTab === 'purchases' && (
            <img
              src="/images/pud.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 h-full w-full object-contain opacity-[0.08] dark:opacity-[0.12]"
            />
          )}
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'allocation' && <MonitoringPudView />}
                {activeTab === 'products' && <ProductsView />}
                {activeTab === 'farmers' && <FarmersView />}
                {activeTab === 'ppts' && <PptsView />}
                {activeTab === 'monitoring-ppts' && <MonitoringPptsView />}
                {activeTab === 'monitoring-pud' && <MonitoringPudView />}
                {activeTab === 'warehouses' && <WarehousesView hideAddButton={false} />}
                {activeTab === 'monitoring-warehouses' && <WarehousesView hideAddButton={true} />}
                {activeTab === 'stock' && <StockView />}
                {activeTab === 'stock-confirmation' && <StockConfirmationView reportMode={false} />}
                {activeTab === 'stock-confirmation-report' && <StockConfirmationView reportMode={true} />}
                {activeTab === 'distributions' && <DistributionsView />}
                {(activeTab === 'orders' || activeTab === 'monitoring-order') && <OrdersView />}
                {activeTab === 'purchases' && <PurchasesView />}
                {activeTab === 'rpkp' && <RPKPView />}
                {activeTab === 'reports' && <ReportsView />}
                {activeTab === 'activity' && <ActivityLogView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t-2 footer-gradient-border bg-card/50 px-4 py-2 mt-auto">
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Leaf className="h-3 w-3 text-primary transition-transform duration-500 hover:rotate-12" />
              <span className="font-medium text-foreground/80">SiPUPUK</span>
              <span className="hidden sm:inline">— Sistem Informasi Penjualan Pupuk Bersubsidi</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1 font-mono">v1.2.0</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-border">|</span>
              <span>© {new Date().getFullYear()} tengon</span>
            </div>
          </div>
        </footer>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  )
}
