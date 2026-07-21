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
}

export interface Product {
  id: string
  name: string
  type: string
  pricePerKg: number
  subsidyPrice: number
  description: string | null
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
    const error = await res.json().catch(() => ({ message: 'Terjadi kesalahan' }))
    throw new Error(error.message || `HTTP ${res.status}`)
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

// Activity Log
export interface ActivityLog {
  id: string
  action: string
  detail: string
  userId: string | null
  createdAt: string
}

export const fetchActivityLogs = () => apiFetch<ActivityLog[]>('/api/activity-log')

// Seed
export const seedData = () => apiFetch<{ message: string }>('/api/seed', { method: 'POST' })