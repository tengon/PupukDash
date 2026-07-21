export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  return new Intl.NumberFormat('id-ID').format(num)
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