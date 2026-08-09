// Types
export interface DashboardData {
  totalFarmers: number
  totalProducts: number
  totalOrders: number
  totalSubsidy: number
  monthlySales: { month: string; total: number; subsidy: number }[]
  productDistribution: { name: string; value: number }[]
  recentOrders: OrderWithDetails[]
  stockAlerts: StockWithProductAndWarehouse[]
  topFarmers: { id: string; name: string; totalOrders: number; totalAmount: number }[]
  topFarmerThisMonth: { id: string; name: string; totalOrders: number; totalAmount: number } | null
  dailySalesThisMonth: Array<{
    day: number
    orders: number
    totalKg: number
    revenue: number
  }>
}

export interface Product {
  id: string
  name: string
  type: string
  pricePerKg: number
  subsidyPrice: number
  pricePud?: number
  pricePpts?: number
  priceHet?: number
  description: string | null
  imageUrl?: string | null
  isActive: boolean
  totalStock?: number
  stockByWarehouse?: { warehouseName: string; warehouseCode: string; quantity: number }[]
  orderItemCount?: number
  createdAt: string
  updatedAt: string
}

export interface Farmer {
  id: string
  nik: string
  name: string
  phone: string | null
  address: string | null
  village: string | null
  district: string | null
  regency: string | null
  province: string | null
  landAreaHa: number | null
  farmerGroup: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { orders: number }
}

export interface Warehouse {
  id: string
  code: string
  name: string
  address: string
  district: string | null
  regency: string | null
  province: string
  managerName: string | null
  managerPhone: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  totalStock?: number
  stockEntries?: number
  orderCount?: number
  distributionCount?: number
}

export interface StockWithProductAndWarehouse {
  id: string
  warehouseId: string
  productId: string
  quantity: number
  minStock: number
  lastRestocked: string | null
  createdAt: string
  updatedAt: string
  warehouse: { id: string; name: string; code: string }
  product: { id: string; name: string; type: string; pricePerKg: number; subsidyPrice: number }
}

export interface Distribution {
  id: string
  distributionNo: string
  warehouseId: string
  productId: string
  productName: string
  quantity: number
  sourceRegency: string | null
  targetVillage: string | null
  targetGroup: string | null
  status: string
  notes: string | null
  distributedAt: string | null
  createdAt: string
  updatedAt: string
  warehouse: { id: string; name: string; code: string }
}

export interface OrderWithDetails {
  id: string
  orderNumber: string
  farmerId: string
  warehouseId: string
  status: string
  totalAmount: number
  totalSubsidy: number
  notes: string | null
  createdAt: string
  updatedAt: string
  farmer: { id: string; name: string; nik: string }
  warehouse: { id: string; name: string; code: string }
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  quantity: number
  pricePerKg: number
  subtotal: number
  product: { id: string; name: string; type: string; subsidyPrice: number }
}

// API base helper
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Terjadi kesalahan sistem' }))
    throw new Error(errorData.error || errorData.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// Dashboard
export const fetchDashboard = () => apiFetch<DashboardData>('/api/dashboard')

// Products
export const fetchProducts = () => apiFetch<Product[]>('/api/products')
export const createProduct = (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | '_count'>) =>
  apiFetch<Product>('/api/products', { method: 'POST', body: JSON.stringify(data) })
export const updateProduct = (id: string, data: Partial<Product>) =>
  apiFetch<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteProduct = (id: string) =>
  apiFetch<{ message: string }>(`/api/products/${id}`, { method: 'DELETE' })

// Farmers
export const fetchFarmers = () => apiFetch<Farmer[]>('/api/farmers')

export interface FarmerOrderSummary {
  totalOrders: number
  totalKg: number
  totalSubsidy: number
  totalAmount: number
}

export interface FarmerOrdersResponse {
  farmer: {
    id: string
    name: string
    nik: string
    phone: string | null
    address: string | null
    village: string | null
    district: string | null
    regency: string | null
    province: string | null
    landAreaHa: number | null
    farmerGroup: string | null
    isActive: boolean
  }
  orders: OrderWithDetails[]
  summary: FarmerOrderSummary
}

export const fetchFarmerOrders = (farmerId: string) =>
  apiFetch<FarmerOrdersResponse>(`/api/farmers/${farmerId}/orders`)
export const createFarmer = (data: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt' | '_count'>) =>
  apiFetch<Farmer>('/api/farmers', { method: 'POST', body: JSON.stringify(data) })
export const updateFarmer = (id: string, data: Partial<Farmer>) =>
  apiFetch<Farmer>(`/api/farmers/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteFarmer = (id: string) =>
  apiFetch<{ message: string }>(`/api/farmers/${id}`, { method: 'DELETE' })

// Warehouses
export const fetchWarehouses = () => apiFetch<Warehouse[]>('/api/warehouses')
export const createWarehouse = (data: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt' | '_count'>) =>
  apiFetch<Warehouse>('/api/warehouses', { method: 'POST', body: JSON.stringify(data) })
export const updateWarehouse = (id: string, data: Partial<Warehouse>) =>
  apiFetch<Warehouse>(`/api/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteWarehouse = (id: string) =>
  apiFetch<{ message: string }>(`/api/warehouses/${id}`, { method: 'DELETE' })

// Stock
export const fetchStock = () => apiFetch<StockWithProductAndWarehouse[]>('/api/stock')
export const addStock = (data: { warehouseId: string; productId: string; quantity: number; minStock?: number }) =>
  apiFetch<StockWithProductAndWarehouse>('/api/stock', { method: 'POST', body: JSON.stringify(data) })
export const updateStock = (id: string, data: { quantity?: number; minStock?: number }) =>
  apiFetch<StockWithProductAndWarehouse>(`/api/stock/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteStock = (id: string) =>
  apiFetch<{ message: string }>(`/api/stock/${id}`, { method: 'DELETE' })

// Distributions
export const fetchDistributions = () => apiFetch<Distribution[]>('/api/distributions')
export const createDistribution = (data: {
  warehouseId: string
  productId: string
  productName: string
  quantity: number
  targetVillage?: string
  targetGroup?: string
  notes?: string
}) => apiFetch<Distribution>('/api/distributions', { method: 'POST', body: JSON.stringify(data) })
export const updateDistribution = (id: string, data: { status?: string; notes?: string }) =>
  apiFetch<Distribution>(`/api/distributions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteDistribution = (id: string) =>
  apiFetch<{ message: string }>(`/api/distributions/${id}`, { method: 'DELETE' })

// Orders
export interface OrdersResponse {
  orders: OrderWithDetails[]
  summary: {
    total: number
    byStatus: Record<string, number>
  }
}

export const fetchOrders = (params?: { status?: string; fromDate?: string; toDate?: string }) => {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.fromDate) searchParams.set('fromDate', params.fromDate)
  if (params?.toDate) searchParams.set('toDate', params.toDate)
  const qs = searchParams.toString()
  return apiFetch<OrdersResponse>(`/api/orders${qs ? `?${qs}` : ''}`)
}
export const createOrder = (data: {
  farmerId: string
  warehouseId: string
  items: { productId: string; productName: string; quantity: number; pricePerKg: number; subtotal: number }[]
  totalAmount: number
  totalSubsidy: number
  notes?: string
}) => apiFetch<OrderWithDetails>('/api/orders', { method: 'POST', body: JSON.stringify(data) })
export const updateOrder = (id: string, data: { status?: string; notes?: string }) =>
  apiFetch<OrderWithDetails>(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// Stock transfer
export const transferStock = (data: { fromWarehouseId: string; toWarehouseId: string; productId: string; quantity: number }) =>
  apiFetch<{ message: string }>('/api/stock/transfer', { method: 'POST', body: JSON.stringify(data) })

// Farmer Quota
export interface FarmerQuota {
  farmer: { name: string; nik: string; landAreaHa: number | null; farmerGroup: string | null }
  quotas: Array<{
    productType: string
    maxQuantityKg: number
    usedQuantityKg: number
    remainingKg: number
    utilizationPercent: number
  }>
}

export const fetchFarmerQuota = (farmerId: string) =>
  apiFetch<FarmerQuota>(`/api/farmers/${farmerId}/quota`)

// Activity Log
export interface ActivityLog {
  id: string
  action: string
  detail: string
  userId: string | null
  createdAt: string
}

export const fetchActivityLogs = (params?: { action?: string; limit?: number; offset?: number }) => {
  const searchParams = new URLSearchParams()
  if (params?.action) searchParams.set('action', params.action)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))
  const qs = searchParams.toString()
  return apiFetch<{ logs: ActivityLog[]; total: number }>(`/api/activity-log${qs ? `?${qs}` : ''}`)
}

// Search
export interface SearchResult {
  products: Array<{ id: string; name: string; type: string; subtitle: string }>
  farmers: Array<{ id: string; name: string; nik: string; subtitle: string }>
  orders: Array<{ id: string; orderNumber: string; subtitle: string; status: string }>
  warehouses: Array<{ id: string; name: string; code: string; subtitle: string }>
  ppts: Array<{ id: string; name: string; code: string; subtitle: string }>
}

export const fetchSearch = (query: string) =>
  apiFetch<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`)

// Warehouse Stock Detail
export interface WarehouseStockEntry {
  id: string
  productName: string
  productType: string
  quantity: number
  minStock: number
  lastRestocked: string | null
  subsidyPrice: number
}

export interface WarehouseStockDetail {
  warehouse: {
    id: string
    code: string
    name: string
    address: string
    district: string | null
    regency: string | null
    province: string
    managerName: string | null
    managerPhone: string | null
  }
  stockEntries: WarehouseStockEntry[]
  summary: {
    totalStock: number
    totalProducts: number
    lowStockCount: number
  }
}

export const fetchWarehouseStock = (warehouseId: string) =>
  apiFetch<WarehouseStockDetail>(`/api/warehouses/${warehouseId}/stock`)

// RPKP
export interface RPKPProduct {
  productType: string
  allocationPerHa: number
  totalAllocationKg: number
  actualSoldKg: number
  remainingKg: number
  utilizationPercent: number
  hetPrice: number
  totalSubsidyValue: number
}

export interface RPKPData {
  year: number
  totalLandAreaHa: number
  totalFarmers: number
  products: RPKPProduct[]
  summary: {
    totalAllocationKg: number
    totalSoldKg: number
    totalRemainingKg: number
    overallUtilizationPercent: number
    totalSubsidyValue: number
  }
}

export const fetchRPKP = (year?: number) => {
  const params = year ? `?year=${year}` : ''
  return apiFetch<RPKPData>(`/api/reports/rpkp${params}`)
}

// Monthly Report
export interface MonthlyReportProduct {
  productName: string
  productType: string
  totalKg: number
  totalRevenue: number
  totalSubsidy: number
  orderCount: number
  avgPricePerKg: number
}

export interface MonthlyReportWarehouse {
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  totalOrders: number
  totalKg: number
  totalRevenue: number
  totalSubsidy: number
}

export interface MonthlyReportFarmer {
  farmerId: string
  farmerName: string
  farmerNik: string
  totalOrders: number
  totalKg: number
  totalAmount: number
  totalSubsidy: number
}

export interface DailySale {
  date: string
  orders: number
  kg: number
  revenue: number
}

export interface MonthlyReportData {
  period: {
    month: number
    year: number
    label: string
  }
  summary: {
    totalOrders: number
    completedOrders: number
    cancelledOrders: number
    pendingOrders: number
    totalKgSold: number
    totalRevenue: number
    totalSubsidy: number
    totalFarmersServed: number
    uniqueProductsSold: number
  }
  byProduct: MonthlyReportProduct[]
  byWarehouse: MonthlyReportWarehouse[]
  topFarmers: MonthlyReportFarmer[]
  dailySales: DailySale[]
}

export const fetchMonthlyReport = (month: string) =>
  apiFetch<MonthlyReportData>(`/api/reports/monthly?month=${month}`)

// Notifications
export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  icon: string
  color: string
  createdAt: string
  action: { tab: string; filter?: string }
}

export const fetchNotifications = () =>
  apiFetch<{ notifications: AppNotification[] }>('/api/notifications')

// Seed & Clear
export const seedData = () => apiFetch<{ message: string }>('/api/seed', { method: 'POST' })
export const clearData = () => apiFetch<{ message: string }>('/api/seed', { method: 'DELETE' })

// PPTS
export interface Ppts {
  id: string
  code: string
  name: string
  address: string
  district: string
  village: string | null
  regency: string | null
  province: string | null
  ownerName: string | null
  phone: string | null
  spjbNumber: string | null
  spjbDate: string | null
  spjbValidFrom: string | null
  spjbValidUntil: string | null
  alokasiUrea: number | null
  alokasiNpk: number | null
  realisasiUrea?: number | null
  realisasiNpk?: number | null
  sisaUrea?: number | null
  sisaNpk?: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const fetchPptsList = (params?: { search?: string; district?: string }) => {
  const query = new URLSearchParams()
  if (params?.search) query.append('search', params.search)
  if (params?.district && params.district !== 'all') query.append('district', params.district)
  const queryString = query.toString()
  return apiFetch<Ppts[]>(`/api/ppts${queryString ? `?${queryString}` : ''}`)
}

export const createPpts = (data: Partial<Ppts>) =>
  apiFetch<Ppts>('/api/ppts', { method: 'POST', body: JSON.stringify(data) })

export const updatePpts = ({ id, data }: { id: string; data: Partial<Ppts> }) =>
  apiFetch<Ppts>(`/api/ppts/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deletePpts = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/ppts/${id}`, { method: 'DELETE' })

// Purchases (Pembelian dari Supplier)
export interface Purchase {
  id: string
  purchaseNo: string
  supplierName: string
  warehouseId: string
  productId: string
  quantity: number
  pricePerKg: number
  totalAmount: number
  status: string
  notes: string | null
  purchasedAt: string
  createdAt: string
  updatedAt: string
  warehouse: { id: string; name: string; code: string }
  product: { id: string; name: string; type: string; pricePerKg: number; subsidyPrice: number; imageUrl?: string | null }
}

export const fetchPurchases = (params?: { search?: string; warehouseId?: string }) => {
  const query = new URLSearchParams()
  if (params?.search) query.append('search', params.search)
  if (params?.warehouseId && params.warehouseId !== 'all') query.append('warehouseId', params.warehouseId)
  const qs = query.toString()
  return apiFetch<Purchase[]>(`/api/purchases${qs ? `?${qs}` : ''}`)
}

export const createPurchase = (data: Partial<Purchase>) =>
  apiFetch<Purchase>('/api/purchases', { method: 'POST', body: JSON.stringify(data) })

export const updatePurchase = (id: string, data: Partial<Purchase>) =>
  apiFetch<Purchase>(`/api/purchases/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deletePurchase = (id: string) =>
  apiFetch<{ message: string }>(`/api/purchases/${id}`, { method: 'DELETE' })

// Stok PPTS (Kios iPuber GOW CM)
export interface PptsStockItem {
  kodeKios: string
  namaKios: string
  kodeProduct: string
  namaProduct: string
  stokKg: string
  syncnAt: string
  added_at?: string
  updated_at?: string
}

export interface PptsStockResponse {
  success: boolean
  scraped_at: string | null
  total_records: number
  total_kios: number
  last_sync_summary?: {
    scraped_records: number
    added_new: number
    updated: number
    unchanged: number
  } | null
  data: PptsStockItem[]
  message?: string
}

export const fetchPptsStock = (params?: { search?: string; product?: string }) => {
  const query = new URLSearchParams()
  if (params?.search) query.append('search', params.search)
  if (params?.product && params.product !== 'ALL') query.append('product', params.product)
  const qs = query.toString()
  return apiFetch<PptsStockResponse>(`/api/stock/ppts${qs ? `?${qs}` : ''}`)
}

// SPJB PPTS (Monitoring SPJB Kontrak Kios)
export interface SpjbPptsItem {
  nomorSpjb: string
  kodePpts: string
  namaPpts: string
  kodePud: string
  namaPud: string
  provinsi: string
  kabupaten: string
  status: string
  tanggalAwal: string
  tanggalAkhir: string
  detail?: {
    header?: { judul?: string; status?: string }
    alokasiTable?: {
      headers?: string[]
      rows?: string[][]
    }
  }
}

export interface SpjbPptsResponse {
  success: boolean
  scraped_at: string | null
  total: number
  last_sync_summary?: {
    scraped_records: number
    added_new: number
    updated: number
    unchanged: number
  } | null
  data: SpjbPptsItem[]
  message?: string
}

export const fetchSpjbPpts = (params?: { search?: string; status?: string }) => {
  const query = new URLSearchParams()
  if (params?.search) query.append('search', params.search)
  if (params?.status && params.status !== 'ALL') query.append('status', params.status)
  const qs = query.toString()
  return apiFetch<SpjbPptsResponse>(`/api/gowcm/spjb-ppts${qs ? `?${qs}` : ''}`)
}

// SPJB Operasional (Monitoring SPJB Distributor PUD)
export interface SpjbOperasionalItem {
  nomorSpjb: string
  tahun: string
  distributor: string
  produsen: string
  tanggalBuat: string
  tanggalGanti: string
  status: string
  detail?: {
    header?: { judul?: string; status?: string }
    alokasiTable?: {
      headers?: string[]
      rows?: string[][]
    }
  }
}

export interface SpjbOperasionalResponse {
  success: boolean
  scraped_at: string | null
  total: number
  last_sync_summary?: {
    scraped_records: number
    added_new: number
    updated: number
    unchanged: number
  } | null
  data: SpjbOperasionalItem[]
  message?: string
}

export const fetchSpjbOperasional = (params?: { search?: string; produsen?: string }) => {
  const query = new URLSearchParams()
  if (params?.search) query.append('search', params.search)
  if (params?.produsen && params.produsen !== 'ALL') query.append('produsen', params.produsen)
  const qs = query.toString()
  return apiFetch<SpjbOperasionalResponse>(`/api/gowcm/spjb-operasional${qs ? `?${qs}` : ''}`)
}

export interface GowcmPenyaluranItem {
  nomorOrder: string
  statusOrder: string
  kodePengecer: string
  namaPengecer: string
  provinsi?: string
  kabupatenKota?: string
  kecamatan?: string
  tanggalOrder?: string
  durasiOrder?: string
  pembayaran?: string
  nilaiOrderRupiah?: string
  totalQtyTon?: string
  terakhirDiperbarui?: string
  kodeDistributor?: string
  namaDistributor?: string
  detailPemenuhanCount?: number
  detailPemenuhan?: Array<{
    noPkp?: string
    kodeSo?: string
    produk?: string
    qtyTon?: string
    status?: string
    tanggalPenyaluran?: string
  }>
}

export interface GowcmPenyaluranResponse {
  total: number
  data: GowcmPenyaluranItem[]
  summary?: any
  updated_at?: string | null
}

export const fetchGowcmPenyaluran = (params?: { search?: string; status?: string; kecamatan?: string; produk?: string }) => {
  const query = new URLSearchParams()
  if (params?.search) query.append('search', params.search)
  if (params?.status && params.status !== 'ALL') query.append('status', params.status)
  if (params?.kecamatan && params.kecamatan !== 'ALL') query.append('kecamatan', params.kecamatan)
  if (params?.produk && params.produk !== 'ALL') query.append('produk', params.produk)
  const qs = query.toString()
  return apiFetch<GowcmPenyaluranResponse>(`/api/gowcm/penyaluran${qs ? `?${qs}` : ''}`)
}



