export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 3,
  }).format(num)
}

export interface ProductPriceDetails {
  het: number
  pud: number
  ppts: number
  cleanDescription: string
}

export function getProductPriceDetails(product: {
  type: string
  pricePerKg: number
  pricePud?: number
  pricePpts?: number
  priceHet?: number
  description?: string | null
}): ProductPriceDetails {
  const isNpk = product.type === 'NPK'
  let het = product.pricePerKg || (isNpk ? 2300 : 2250)
  let pud = isNpk ? het - 250 : het - 300
  let ppts = het - 150
  let cleanDescription = product.description || ''

  if (product.description && product.description.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(product.description)
      if (typeof parsed === 'object' && parsed !== null) {
        if (typeof parsed.het === 'number') het = parsed.het
        if (typeof parsed.pud === 'number') pud = parsed.pud
        if (typeof parsed.ppts === 'number') ppts = parsed.ppts
        if (typeof parsed.desc === 'string') cleanDescription = parsed.desc
      }
    } catch (e) {
      // ignore
    }
  } else {
    if (product.pricePud) pud = product.pricePud
    if (product.pricePpts) ppts = product.pricePpts
    if (product.priceHet) het = product.priceHet
  }

  return { het, pud, ppts, cleanDescription }
}

export function encodeProductDescription(pud: number, ppts: number, het: number, descText: string): string {
  return JSON.stringify({
    pud,
    ppts,
    het,
    desc: descText || '',
  })
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Order statuses
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
    PICKED_UP: 'bg-green-100 text-green-800 border-green-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    // Distribution statuses
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    IN_TRANSIT: 'bg-amber-100 text-amber-800 border-amber-200',
    DELIVERED: 'bg-green-100 text-green-800 border-green-200',
    // General
    ACTIVE: 'bg-green-100 text-green-800 border-green-200',
    INACTIVE: 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Menunggu',
    CONFIRMED: 'Dikonfirmasi',
    PICKED_UP: 'Diambil',
    CANCELLED: 'Dibatalkan',
    COMPLETED: 'Selesai',
    DRAFT: 'Draft',
    IN_TRANSIT: 'Dalam Pengiriman',
    DELIVERED: 'Diterima',
    ACTIVE: 'Aktif',
    INACTIVE: 'Tidak Aktif',
  }
  return labels[status] || status
}

export function getTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    UREA: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    NPK: 'bg-teal-100 text-teal-800 border-teal-200',
    'SP-36': 'bg-lime-100 text-lime-800 border-lime-200',
    ZA: 'bg-green-100 text-green-800 border-green-200',
    ORGANIK: 'bg-amber-100 text-amber-800 border-amber-200',
  }
  return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getStockStatusColor(quantity: number, minStock: number): string {
  const ratio = quantity / minStock
  if (ratio <= 0.5) return 'bg-red-100 text-red-800 border-red-200'
  if (ratio <= 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-green-100 text-green-800 border-green-200'
}

export function getStockStatusLabel(quantity: number, minStock: number): string {
  const ratio = quantity / minStock
  if (ratio <= 0.5) return 'Kritis'
  if (ratio <= 1) return 'Rendah'
  return 'Aman'
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return 'baru saja'
  if (diffMin < 60) return `${diffMin} menit yang lalu`
  if (diffHour < 24) return `${diffHour} jam yang lalu`
  if (diffDay < 7) return `${diffDay} hari yang lalu`
  if (diffWeek < 5) return `${diffWeek} minggu yang lalu`
  if (diffMonth < 12) return `${diffMonth} bulan yang lalu`
  return `${Math.floor(diffMonth / 12)} tahun yang lalu`
}

export function getActivityActionColor(action: string): string {
  const colors: Record<string, string> = {
    CREATE_ORDER: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800',
    UPDATE_STATUS: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800',
    CANCEL_ORDER: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800',
    ADD_STOCK: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/40 dark:text-teal-400 dark:border-teal-800',
    UPDATE_STOCK: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800',
    TRANSFER_STOCK: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800',
    CREATE_DISTRIBUTION: 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-900/40 dark:text-lime-400 dark:border-lime-800',
    UPDATE_DISTRIBUTION_STATUS: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-400 dark:border-cyan-800',
    CANCEL_DISTRIBUTION: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800',
    VIEW_MONTHLY_REPORT: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400 dark:border-indigo-800',
    VIEW_RPKP: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800',
    SEED_DATA: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-800',
    IMPORT_FARMERS: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800',
  }
  return colors[action] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-800'
}

export function getActivityActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE_ORDER: 'Pesanan Baru',
    UPDATE_STATUS: 'Status Diubah',
    CANCEL_ORDER: 'Dibatalkan',
    ADD_STOCK: 'Stok Ditambah',
    UPDATE_STOCK: 'Stok Diperbarui',
    TRANSFER_STOCK: 'Transfer Stok',
    CREATE_DISTRIBUTION: 'Distribusi Baru',
    UPDATE_DISTRIBUTION_STATUS: 'Status Distribusi',
    CANCEL_DISTRIBUTION: 'Distribusi Dibatalkan',
    VIEW_MONTHLY_REPORT: 'Lihat Laporan Bulanan',
    VIEW_RPKP: 'Lihat RPKP',
    SEED_DATA: 'Muat Data Sample',
    IMPORT_FARMERS: 'Import Petani',
    CREATE_FARMER: 'Petani Baru',
    UPDATE_FARMER: 'Petani Diperbarui',
    DELETE_FARMER: 'Petani Dihapus',
    CREATE_PRODUCT: 'Produk Baru',
    UPDATE_PRODUCT: 'Produk Diperbarui',
    DELETE_PRODUCT: 'Produk Dihapus',
    CREATE_WAREHOUSE: 'Gudang Baru',
    UPDATE_WAREHOUSE: 'Gudang Diperbarui',
    DELETE_WAREHOUSE: 'Gudang Dihapus',
  }
  return labels[action] || action
}

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  UREA: '/images/urea-sub-psp.png',
  NPK: '/images/npk-phonska-sub.png',
  'SP-36': '/images/sp36.png',
  SP36: '/images/sp36.png',
  ZA: '/images/za.png',
  ORGANIK: '/images/organik.png',
}

export function getProductImage(typeOrName?: string | null, customUrl?: string | null): string {
  if (customUrl) return customUrl
  if (!typeOrName) return '/images/urea-sub-psp.png'
  const upper = typeOrName.toUpperCase()
  for (const [key, path] of Object.entries(PRODUCT_IMAGE_MAP)) {
    if (upper.includes(key)) return path
  }
  return '/images/urea-sub-psp.png'
}