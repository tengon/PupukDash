'use client'

import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
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
  Leaf,
  FileBarChart,
  ClipboardList,
  History,
  Store,
  ShoppingBag,
  Clock,
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
      { id: 'stock', label: 'Stok', icon: Boxes },
      { id: 'monitoring-warehouses', label: 'Gudang', icon: Warehouse },
      { id: 'distributions', label: 'Distribusi', icon: Truck },
    ],
  },
  {
    label: 'LAPORAN & REKAP',
    items: [
      { id: 'rpkp', label: 'RPKP', icon: ClipboardList },
      { id: 'reports', label: 'Laporan', icon: FileBarChart },
      { id: 'activity', label: 'Aktivitas', icon: History },
    ],
  },
  {
    label: 'DATA',
    items: [
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
  const { activeTab, setActiveTab } = useAppStore()
  const { setOpen, setOpenMobile, isMobile } = useSidebar()
  const wibTime = useWIBClock()
  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="none" className="bg-sidebar sticky top-0 h-screen overflow-hidden select-none">
      <SidebarHeader className="px-2 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 shadow-sm">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">SiPUPUK</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Pupuk Bersubsidi
            </span>
            {/* {wibTime && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono tabular-nums">{wibTime}</span>
              </div>
            )} */}
          </div>
          <div className="ml-auto">
            <ThemeToggle className='absolute top-2 right-2' size='sm' />
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-1 py-1 space-y-1 overflow-hidden">
        {navGroups.map((group, groupIdx) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[10px] font-bold tracking-wider text-emerald-600/90 dark:text-emerald-400/90 uppercase px-3 py-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className={(group.label === 'MONITORING' || group.label === 'DATA' || group.label === 'TRANSAKSI' || group.label === 'LAPORAN & REKAP') ? 'group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:pl-0 border-l-2 border-l-emerald-500/30 dark:border-l-emerald-400/25 ml-3.5 pl-1.5 space-y-0.5 transition-all' : ''}>
              <SidebarMenu>
                {group.items.map((item, itemIdx) => {
                  const isActive = activeTab === item.id
                  const isMonitoring = group.label === 'MONITORING'
                  const isBranch = group.label === 'MONITORING' || group.label === 'DATA' || group.label === 'TRANSAKSI'
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        onClick={() => handleNavClick(item.id)}
                        className={`relative transition-all duration-200 ${isActive
                          ? 'bg-sidebar-accent/80 font-medium border-l-[3px] border-l-emerald-400 rounded-l-none pl-[calc(0.5rem-3px)] sidebar-active-glow'
                          : 'hover:bg-sidebar-accent/50 hover:border-l-[3px] hover:border-l-emerald-400/40 hover:rounded-l-none hover:pl-[calc(0.5rem-3px)]'
                          }`}
                      >
                        <div className="relative flex items-center">
                          {isActive && (
                            <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                          )}
                          <item.icon className={`h-4 w-4 transition-colors duration-200 ${isActive ? 'text-emerald-400' : isBranch ? 'text-emerald-500/90 dark:text-emerald-400/90' : ''}`} />
                        </div>
                        <span className="flex items-center gap-1.5">
                          {item.label}
                          {isMonitoring && (
                            <span className="group-data-[collapsible=icon]:hidden text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono scale-90">
                              {itemIdx === 0 ? 'Stok' : itemIdx === 1 ? 'Gudang' : 'Distribusi'}
                            </span>
                          )}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
            {groupIdx < navGroups.length - 1 && (
              <div className="my-1.5 mx-3 h-px bg-sidebar-border/40 group-data-[collapsible=icon]:hidden" />
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="px-4 py-3 group-data-[collapsible=icon]:px-2">
          <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
              CV Anugerah Makmur
            </span>
            <span className="text-[10px] text-muted-foreground">
              Distributor Resmi Pupuk Bersubsidi
            </span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
