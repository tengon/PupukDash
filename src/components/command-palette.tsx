'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { fetchSearch, type SearchResult } from '@/lib/api'
import {
  LayoutGrid,
  Users,
  ShoppingCart,
  Warehouse,
  Search,
  PlusCircle,
  RefreshCw,
  BarChart3,
} from 'lucide-react'

const QUICK_ACTIONS = [
  {
    id: 'create-order',
    label: 'Buat Pesanan Baru',
    icon: PlusCircle,
    tab: 'orders' as const,
    shortcut: 'create-order',
  },
  {
    id: 'restock',
    label: 'Restok Stok',
    icon: RefreshCw,
    tab: 'stock' as const,
  },
  {
    id: 'reports',
    label: 'Lihat Laporan',
    icon: BarChart3,
    tab: 'reports' as const,
  },
]

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveTab, triggerShortcut } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchData = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const data = await fetchSearch(searchQuery)
      setResults(data)
    } catch {
      setResults(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults(null)
      setIsLoading(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      fetchData(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchData])

  const handleSelect = (tab: string, shortcutAction?: string) => {
    setActiveTab(tab)
    if (shortcutAction) triggerShortcut(shortcutAction)
    setCommandPaletteOpen(false)
    setQuery('')
  }

  const hasAnyResults =
    results &&
    (results.products.length > 0 ||
      results.farmers.length > 0 ||
      results.orders.length > 0 ||
      results.warehouses.length > 0)

  const isSearching = query.trim().length > 0

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={(open) => {
        if (!open) {
          setQuery('')
          setResults(null)
        }
        setCommandPaletteOpen(open)
      }}
      title="Pencarian SiPUPUK"
      description="Cari produk, petani, pesanan, atau gudang"
    >
      <CommandInput
        placeholder="Cari produk, petani, pesanan, gudang..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Quick Actions - always shown */}
        <CommandGroup heading="Aksi Cepat">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.id}
              value={action.label}
              onSelect={() => handleSelect(action.tab, action.shortcut)}
            >
              <action.icon className="mr-2 h-4 w-4 text-emerald-500" />
              <span>{action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {isSearching && isLoading && (
          <CommandGroup heading="Hasil Pencarian">
            <div className="p-2 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </CommandGroup>
        )}

        {isSearching && !isLoading && !hasAnyResults && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Tidak ada hasil untuk &apos;{query}&apos;
              </p>
            </div>
          </CommandEmpty>
        )}

        {isSearching && !isLoading && hasAnyResults && (
          <>
            {results!.products.length > 0 && (
              <CommandGroup heading="🌱 Produk">
                {results!.products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`product-${product.id}-${product.name}`}
                    onSelect={() => handleSelect('products')}
                  >
                    <LayoutGrid className="mr-2 h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{product.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {product.subtitle}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results!.farmers.length > 0 && (
              <CommandGroup heading="👤 Petani">
                {results!.farmers.map((farmer) => (
                  <CommandItem
                    key={farmer.id}
                    value={`farmer-${farmer.id}-${farmer.name}`}
                    onSelect={() => handleSelect('farmers')}
                  >
                    <Users className="mr-2 h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{farmer.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {farmer.subtitle}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results!.orders.length > 0 && (
              <CommandGroup heading="📋 Pesanan">
                {results!.orders.map((order) => (
                  <CommandItem
                    key={order.id}
                    value={`order-${order.id}-${order.orderNumber}`}
                    onSelect={() => handleSelect('orders')}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{order.orderNumber}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {order.subtitle}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results!.warehouses.length > 0 && (
              <CommandGroup heading="🏭 Gudang">
                {results!.warehouses.map((warehouse) => (
                  <CommandItem
                    key={warehouse.id}
                    value={`warehouse-${warehouse.id}-${warehouse.name}`}
                    onSelect={() => handleSelect('warehouses')}
                  >
                    <Warehouse className="mr-2 h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{warehouse.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {warehouse.subtitle}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}

        {!isSearching && !isLoading && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Ketik untuk mencari di seluruh data
              </p>
            </div>
          </CommandEmpty>
        )}
      </CommandList>
    </CommandDialog>
  )
}