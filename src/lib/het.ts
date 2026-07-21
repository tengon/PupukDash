/**
 * HET (Harga Eceran Tertinggi) — Validasi harga dan alokasi pupuk bersubsidi
 * Berdasarkan Permentan dan regulasi pemerintah Indonesia
 */

// HET Prices per kg (harga subsidi resmi pemerintah)
export const HET_PRICES: Record<string, number> = {
  UREA: 2250,
  NPK: 2300,
  'NPK Phonska': 2300,
  'SP-36': 2000,
  ZA: 1700,
  ORGANIK: 1000,
}

// Alokasi maksimal per hektar berdasarkan jenis pupuk (kg/ha)
const ALLOCATION_PER_HA: Record<string, number> = {
  UREA: 250,
  NPK: 300,
  'NPK Phonska': 300,
  'SP-36': 250,
  ZA: 150,
  ORGANIK: 500,
}

/**
 * Mendapatkan jumlah maksimal pupuk yang boleh dibeli berdasarkan jenis dan luas lahan
 * @param productType Tipe produk pupuk (misalnya 'UREA', 'NPK', dll)
 * @param farmerLandAreaHa Luas lahan petani dalam hektar (null jika tidak diketahui)
 * @returns Jumlah maksimal dalam kg
 */
export function getMaxQuantity(productType: string, farmerLandAreaHa: number | null): number {
  if (farmerLandAreaHa === null || farmerLandAreaHa <= 0) {
    // Jika luas lahan tidak diketahui, gunakan batas default
    return 5000
  }

  const allocationPerHa = ALLOCATION_PER_HA[productType] || ALLOCATION_PER_HA['UREA']
  return Math.floor(farmerLandAreaHa * allocationPerHa)
}

/**
 * Mendapatkan HET (Harga Eceran Tertinggi) untuk suatu jenis produk
 * @param productType Tipe produk pupuk
 * @returns HET per kg dalam Rupiah, atau null jika tidak dikenali
 */
export function getHETPrice(productType: string): number | null {
  // Cek langsung
  if (HET_PRICES[productType] !== undefined) {
    return HET_PRICES[productType]
  }
  // Cek prefix (misalnya "NPK Phonska" → "NPK")
  const key = Object.keys(HET_PRICES).find((k) => productType.toUpperCase().startsWith(k.toUpperCase()))
  return key ? HET_PRICES[key] : null
}

/**
 * Normalisasi tipe produk untuk pencocokan HET
 */
export function normalizeProductType(productType: string): string {
  const upper = productType.toUpperCase().trim()
  // Cocokkan kunci yang paling spesifik dulu
  if (upper.includes('PHONSKA')) return 'NPK Phonska'
  if (upper.includes('SP-36') || upper.includes('SP36')) return 'SP-36'
  if (upper.includes('NPK')) return 'NPK'
  if (upper.includes('UREA')) return 'UREA'
  if (upper.includes('ZA')) return 'ZA'
  if (upper.includes('ORGANIK')) return 'ORGANIK'
  return upper
}

// Tipe untuk item form pesanan
export interface OrderItemForm {
  productId: string
  productName: string
  productType?: string
  quantity: number
  pricePerKg: number
  subsidyPrice: number
  subtotal: number
  subsidySubtotal: number
  hetWarning?: string
}

/**
 * Validasi HET untuk seluruh item pesanan
 * @param items Daftar item pesanan
 * @param farmerLandAreaHa Luas lahan petani
 * @returns { valid: boolean, errors: string[] }
 */
export function validateHET(
  items: OrderItemForm[],
  farmerLandAreaHa: number | null,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item.productId || item.quantity <= 0) continue

    const productType = normalizeProductType(item.productName || item.productType || '')
    const label = item.productName || `Item ${i + 1}`

    // Validasi HET harga
    const het = getHETPrice(productType)
    if (het !== null && item.pricePerKg > het) {
      errors.push(
        `${label}: Harga Rp ${item.pricePerKg.toLocaleString('id-ID')}/kg melebihi HET Rp ${het.toLocaleString('id-ID')}/kg (${productType})`
      )
    }

    // Validasi alokasi berdasarkan luas lahan
    const maxQty = getMaxQuantity(productType, farmerLandAreaHa)
    if (item.quantity > maxQty) {
      const landInfo = farmerLandAreaHa ? `${farmerLandAreaHa} ha lahan` : 'luas lahan tidak diketahui'
      errors.push(
        `${label}: Jumlah ${item.quantity} kg melebihi alokasi maksimal ${maxQty} kg untuk ${landInfo}`
      )
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Mendapatkan peringatan alokasi untuk satu item (tanpa membatalkan)
 * @returns String peringatan atau kosong jika valid
 */
export function getAllocationWarning(
  productType: string,
  quantity: number,
  farmerLandAreaHa: number | null,
): string {
  if (quantity <= 0) return ''

  const normalized = normalizeProductType(productType)
  const maxQty = getMaxQuantity(normalized, farmerLandAreaHa)

  if (quantity > maxQty) {
    const landArea = farmerLandAreaHa ?? null
    const landInfo = landArea ? `${landArea} ha lahan` : 'luas lahan tidak diketahui'
    return `⚠️ Melebihi alokasi maksimal (${maxQty} kg untuk ${landInfo})`
  }

  return ''
}