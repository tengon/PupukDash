'use client'

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
} from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Produk Pupuk', icon: Package },
  { id: 'farmers', label: 'Data Petani', icon: Users },
  { id: 'warehouses', label: 'Gudang', icon: Warehouse },
  { id: 'stock', label: 'Stok', icon: Boxes },
  { id: 'distributions', label: 'Distribusi', icon: Truck },
  { id: 'orders', label: 'Penjualan', icon: ShoppingCart },
  { id: 'rpkp', label: 'RPKP', icon: ClipboardList, separator: true },
  { id: 'reports', label: 'Laporan', icon: FileBarChart },
  { id: 'activity', label: 'Aktivitas', icon: History },
]

export function AppSidebar() {
  const { activeTab, setActiveTab } = useAppStore()
  const { setOpenMobile, isMobile } = useSidebar()

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon" className="bg-gradient-to-b from-sidebar via-sidebar to-oklch(0.24 0.04 155)">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">SiPUPUK</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Pupuk Bersubsidi
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, index) => {
                const isActive = activeTab === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      onClick={() => handleNavClick(item.id)}
                      className={`relative transition-all duration-200 ${isActive
                        ? 'bg-sidebar-accent/80 font-medium border-l-[3px] border-l-emerald-400 rounded-l-none pl-[calc(0.5rem-3px)] sidebar-active-glow'
                        : 'hover:bg-sidebar-accent/50 hover:border-l-[3px] hover:border-l-emerald-400/40 hover:rounded-l-none hover:pl-[calc(0.5rem-3px)]'
                      } ${index === 3 ? 'mt-1' : ''}`}
                    >
                      <div className="relative flex items-center">
                        {isActive && (
                          <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                        )}
                        <item.icon className={`h-4 w-4 transition-colors duration-200 ${isActive ? 'text-emerald-400' : ''}`} />
                      </div>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {(item as typeof navItems[number]).separator && (
                      <div className="my-2 mx-3 h-px bg-sidebar-border/50" />
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="px-4 py-3 group-data-[collapsible=icon]:px-2">
          <div className="flex flex-col gap-1 group-data-[collapsible=icon]:hidden">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Kementerian Pertanian RI
            </span>
            <span className="text-[10px] text-muted-foreground">
              Direktorat Jenderal Pertanian
            </span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}