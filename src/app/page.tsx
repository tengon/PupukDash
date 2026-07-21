'use client'

import { useAppStore } from '@/lib/store'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { ProductsView } from '@/components/products/products-view'
import { FarmersView } from '@/components/farmers/farmers-view'
import { WarehousesView } from '@/components/warehouses/warehouses-view'
import { StockView } from '@/components/stock/stock-view'
import { DistributionsView } from '@/components/distributions/distributions-view'
import { OrdersView } from '@/components/orders/orders-view'
import { seedData } from '@/lib/api'
import { Leaf, Database, Clock } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationBell } from '@/components/notification-bell'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { AnimatePresence, motion } from 'framer-motion'

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Dashboard', description: 'Ringkasan data penjualan pupuk bersubsidi' },
  products: { title: 'Produk Pupuk', description: 'Kelola data produk pupuk bersubsidi' },
  farmers: { title: 'Data Petani', description: 'Kelola data petani penerima pupuk bersubsidi' },
  warehouses: { title: 'Gudang', description: 'Kelola data gudang penyimpanan pupuk' },
  stock: { title: 'Stok Gudang', description: 'Monitor dan kelola stok pupuk di setiap gudang' },
  distributions: { title: 'Distribusi', description: 'Kelola distribusi pupuk ke kelompok tani' },
  orders: { title: 'Penjualan', description: 'Kelola pesanan penjualan pupuk bersubsidi' },
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
  const { activeTab, triggerShortcut } = useAppStore()
  const { toast } = useToast()
  const [isSeeding, setIsSeeding] = useState(false)
  const wibTime = useWIBClock()
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const pageInfo = PAGE_TITLES[activeTab] || PAGE_TITLES.dashboard

  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const result = await seedData()
      toast({ title: 'Berhasil', description: result.message })
    } catch {
      toast({ title: 'Info', description: 'Data sample sudah ada atau gagal memuat', variant: 'destructive' })
    } finally {
      setIsSeeding(false)
    }
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) {
        return
      }

      // Ignore if a dialog is open (Radix sets data-state="open")
      if (document.querySelector('[data-state="open"]')) {
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
    [triggerShortcut],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <SidebarProvider>
      {/* Thin green accent bar at the very top */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 z-[100]" />
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 px-4 bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b-0" style={{ borderBottom: '1px solid transparent', backgroundImage: 'linear-gradient(to bottom, var(--background), var(--background)), linear-gradient(to right, oklch(0.65 0.15 150 / 0.2), oklch(0.55 0.10 145 / 0.15), oklch(0.65 0.12 160 / 0.2))', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center gap-2">
            <Leaf className="h-4 w-4 text-primary hidden sm:block" />
            <div>
              <h1 className="text-sm font-semibold leading-tight">{pageInfo.title}</h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">{pageInfo.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* WIB Clock */}
            {wibTime && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono tabular-nums">{wibTime}</span>
              </div>
            )}
            <NotificationBell />
            <ThemeToggle />
            {/* Keyboard shortcut hints */}
            <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded border border-border bg-muted/50 font-mono text-[10px]">N</kbd>
              <span>Pesanan</span>
              <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded border border-border bg-muted/50 font-mono text-[10px] ml-1">/</kbd>
              <span>Cari</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={handleSeed}
              disabled={isSeeding}
            >
              <Database className="h-3.5 w-3.5" />
              {isSeeding ? 'Memuat...' : 'Muat Data Sample'}
            </Button>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              AD
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'products' && <ProductsView />}
              {activeTab === 'farmers' && <FarmersView />}
              {activeTab === 'warehouses' && <WarehousesView />}
              {activeTab === 'stock' && <StockView />}
              {activeTab === 'distributions' && <DistributionsView />}
              {activeTab === 'orders' && <OrdersView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t bg-card/50 px-4 py-3 mt-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Leaf className="h-3 w-3 text-primary" />
              <span className="font-medium text-foreground/80">SiPUPUK</span>
              <span>— Sistem Informasi Penjualan Pupuk Bersubsidi</span>
            </div>
            <div>© {new Date().getFullYear()} Kementerian Pertanian Republik Indonesia</div>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}