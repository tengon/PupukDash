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
} from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Produk Pupuk', icon: Package },
  { id: 'farmers', label: 'Data Petani', icon: Users },
  { id: 'warehouses', label: 'Gudang', icon: Warehouse },
  { id: 'stock', label: 'Stok', icon: Boxes },
  { id: 'distributions', label: 'Distribusi', icon: Truck },
  { id: 'orders', label: 'Penjualan', icon: ShoppingCart },
]

export function AppSidebar() {
  const { activeTab, setActiveTab } = useAppStore()
  const { setOpenMobile, isMobile } = useSidebar()

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    tooltip={item.label}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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