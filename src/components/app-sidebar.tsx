'use client'

import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScraperDialog } from '@/components/scraper/scraper-dialog'
import { useAppStore } from '@/lib/store'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Package,
  Users,
  Warehouse,
  Boxes,
  Truck,
  ShoppingCart,
  FileBarChart,
  ClipboardList,
  ClipboardCheck,
  History,
  Store,
  ShoppingBag,
  Settings,
  HelpCircle,
  BookOpen,
  LogOut,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Building2,
  Bot,
  Layers,
  PackageCheck,
} from 'lucide-react'

const navGroups = [
  {
    label: 'DASHBOARD',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'TRANSAKSI',
    items: [
      { id: 'orders', label: 'Penjualan (PPTS)', icon: ShoppingCart },
      { id: 'purchases', label: 'Pembelian (Supplier)', icon: ShoppingBag },
    ],
  },
  {
    label: 'MONITORING',
    items: [
      { id: 'monitoring-ppts', label: 'PPTS', icon: Store },
      { id: 'monitoring-pud', label: 'PUD', icon: Warehouse },
      { id: 'monitoring-realisasi', label: 'Realisasi (Stok Kios)', icon: PackageCheck },
      { id: 'monitoring-order', label: 'Order (Monitoring)', icon: ShoppingBag },
      { id: 'stock', label: 'Stok', icon: Boxes },
      { id: 'stock-confirmation', label: 'Konfirmasi Stok', icon: ClipboardCheck },
      { id: 'distributions', label: 'Distribusi', icon: Truck },
    ],
  },
  {
    label: 'LAPORAN & REKAP',
    items: [
      { id: 'rpkp', label: 'RPKP', icon: ClipboardList },
      { id: 'reports', label: 'Laporan', icon: FileBarChart },
      { id: 'stock-confirmation-report', label: 'Konfirmasi Stok', icon: ClipboardCheck },
    ],
  },
  {
    label: 'DATA',
    items: [
      { id: 'allocation', label: 'Alokasi', icon: Layers },
      { id: 'farmers', label: 'Data Petani', icon: Users },
      { id: 'ppts', label: 'PPTS (Kios)', icon: Store },
      { id: 'warehouses', label: 'Gudang', icon: Warehouse },
      { id: 'products', label: 'Produk Pupuk', icon: Package },
    ],
  },
]

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

export function AppSidebar() {
  const [showSettings, setShowSettings] = useState(false)
  const [showScraperDialog, setShowScraperDialog] = useState(false)
  const { activeTab, setActiveTab } = useAppStore()
  const { open, setOpen, setOpenMobile, isMobile } = useSidebar()
  const wibTime = useWIBClock()

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId)
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const isExpanded = open || isMobile

  return (
    <>
      <Sidebar
        collapsible="icon"
        onMouseEnter={() => !isMobile && setOpen(true)}
        onMouseLeave={() => !isMobile && setOpen(false)}
        className="bg-sidebar sticky top-0 h-screen overflow-hidden select-none transition-all duration-300 ease-in-out border-r border-sidebar-border"
      >
        <SidebarHeader className="px-2.5 py-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 shadow-sm">
                <Leaf className="h-5 w-5" />
              </div>
              {isExpanded && (
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold tracking-tight truncate">SiPUPUK</span>
                  <span className="text-[10px] text-muted-foreground leading-tight truncate">
                    Pupuk Bersubsidi
                  </span>
                </div>
              )}
            </div>
            {isExpanded && (
              <Popover open={showSettings} onOpenChange={setShowSettings}>
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none shrink-0"
                    aria-label="Settings & Help"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" side="bottom" sideOffset={4} className="w-56 p-2 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-xs font-semibold">
                    <span className="text-muted-foreground">Mode Tema:</span>
                    <ThemeToggle />
                  </div>
                  <button
                    onClick={() => {
                      setShowScraperDialog(true)
                      setShowSettings(false)
                    }}
                    className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs font-medium hover:bg-sidebar-accent"
                  >
                    <Bot className="h-4 w-4 text-emerald-500" />
                    <span>Scraper GOW CM (6 Jam)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleNavClick('activity')
                      setShowSettings(false)
                    }}
                    className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs font-medium hover:bg-sidebar-accent"
                  >
                    <History className="h-4 w-4 text-emerald-500" />
                    <span>Riwayat Aktivitas</span>
                  </button>
                  <button className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs font-medium hover:bg-sidebar-accent">
                    <HelpCircle className="h-4 w-4 text-emerald-500" />
                    <span>Bantuan</span>
                  </button>
                  <button className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs font-medium hover:bg-sidebar-accent">
                    <BookOpen className="h-4 w-4 text-emerald-500" />
                    <span>Dokumentasi</span>
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent className="px-2 py-1.5 space-y-2 overflow-y-auto">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label} className="p-0">
              {isExpanded && (
                <SidebarGroupLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-1">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleNavClick(item.id)}
                          tooltip={item.label}
                          className={`w-full justify-start gap-2.5 rounded-lg px-2.5 py-2.5 text-xs sm:text-sm font-semibold transition-colors min-h-[40px] ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          }`}
                        >
                          <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-emerald-600 dark:text-emerald-400'}`} />
                          {isExpanded && <span className="truncate">{item.label}</span>}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-2.5 border-t border-sidebar-border mt-auto shrink-0 bg-sidebar-accent/30">
          <div className="flex items-center justify-between gap-2">
            {isExpanded ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-transparent dark:bg-slate-900 border border-emerald-500/30 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-xs">
                  <img src="/images/sipupuk-icon.png" alt="CV. Anugerah Makmur" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-extrabold text-white dark:text-slate-100 truncate">CV. ANUGERAH MAKMUR</span>
                  <span className="text-[10px] text-white dark:text-slate-400 truncate">Distributor Resmi Pupuk</span>
                </div>
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent dark:bg-slate-900 border border-emerald-500/30 mx-auto overflow-hidden p-0.5 shadow-xs" title="CV. ANUGERAH MAKMUR">
                <img src="/images/sipupuk-icon.png" alt="CV. Anugerah Makmur" className="h-full w-full object-contain" />
              </div>
            )}

            {!isMobile && isExpanded && (
              <button
                onClick={() => setOpen(!open)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground shrink-0"
                title={open ? 'Minimize Sidebar' : 'Expand Sidebar'}
              >
                {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Scraper & Auto-Sync Dialog */}
      <ScraperDialog open={showScraperDialog} onOpenChange={setShowScraperDialog} />
    </>
  )
}
