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
import { Leaf, Database } from 'lucide-react'
import { useEffect, useState } from 'react'
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

export default function HomePage() {
  const { activeTab } = useAppStore()
  const { toast } = useToast()
  const [isSeeding, setIsSeeding] = useState(false)

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
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
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
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