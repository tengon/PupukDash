/**
 * Utilitas impor data petani dari CSV
 * Format CSV yang didukung: NIK, Nama, Telepon, Alamat, Desa, Kecamatan, Kabupaten, Provinsi, Luas Lahan (ha), Kelompok Tani
 */

export interface FarmerImportRow {
  row: number           // Nomor baris di CSV (1-based, 0 = header)
  nik: string
  name: string
  phone: string
  address: string
  village: string
  district: string
  regency: string
  province: string
  landAreaHa: number | null
  farmerGroup: string
  error?: string         // Jika ada error validasi
  valid: boolean
}

const REQUIRED_FIELDS = ['NIK', 'Nama']
const EXPECTED_HEADERS = ['NIK', 'Nama', 'Telepon', 'Alamat', 'Desa', 'Kecamatan', 'Kabupaten', 'Provinsi', 'Luas Lahan (ha)', 'Kelompok Tani']

/**
 * Parse baris CSV yang sederhana (mendukung tanda kutip ganda)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Parse teks CSV menjadi array FarmerImportRow
 * @param csvText Teks mentah dari file CSV
 * @returns Promise<FarmerImportRow[]>
 */
export async function parseFarmerCSV(csvText: string): Promise<FarmerImportRow[]> {
  // Normalisasi line endings
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter((line) => line.trim() !== '')

  if (lines.length === 0) {
    throw new Error('File CSV kosong')
  }

  // Parse header
  const headerLine = parseCSVLine(lines[0])
  const headers = headerLine.map((h) => h.trim().toLowerCase())

  // Buat mapping header → index
  const headerMap: Record<string, number> = {}
  for (let i = 0; i < headers.length; i++) {
    headerMap[headers[i]] = i
  }

  // Validasi header wajib
  const missingRequired: string[] = []
  for (const req of REQUIRED_FIELDS) {
    if (!(req.toLowerCase() in headerMap)) {
      missingRequired.push(req)
    }
  }
  if (missingRequired.length > 0) {
    throw new Error(`Kolom wajib tidak ditemukan: ${missingRequired.join(', ')}`)
  }

  // Fungsi untuk mendapatkan nilai kolom
  const getCol = (row: string[], name: string): string => {
    const idx = headerMap[name.toLowerCase()]
    if (idx !== undefined && idx < row.length) {
      return row[idx].replace(/^"|"$/g, '').trim()
    }
    // Coba juga dengan nama alternatif
    const altNames: Record<string, string[]> = {
      'luas lahan (ha)': ['luas lahan', 'luas_lahan', 'landareaha', 'luaslahan(ha)'],
      'kelompok tani': ['kelompok_tani', 'poktan', 'grouptani'],
      'telepon': ['phone', 'no hp', 'no_hp', 'hp'],
    }
    const alts = altNames[name.toLowerCase()]
    if (alts) {
      for (const alt of alts) {
        const altIdx = headerMap[alt.toLowerCase()]
        if (altIdx !== undefined && altIdx < row.length) {
          return row[altIdx].replace(/^"|"$/g, '').trim()
        }
      }
    }
    return ''
  }

  // Parse data rows
  const results: FarmerImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])

    const nik = getCol(cols, 'NIK')
    const name = getCol(cols, 'Nama')
    const phone = getCol(cols, 'Telepon')
    const address = getCol(cols, 'Alamat')
    const village = getCol(cols, 'Desa')
    const district = getCol(cols, 'Kecamatan')
    const regency = getCol(cols, 'Kabupaten')
    const province = getCol(cols, 'Provinsi')
    const landAreaRaw = getCol(cols, 'Luas Lahan (ha)')
    const farmerGroup = getCol(cols, 'Kelompok Tani')

    // Validasi
    const errors: string[] = []

    if (!nik) {
      errors.push('NIK wajib diisi')
    } else if (!/^\d{16}$/.test(nik.replace(/\s/g, ''))) {
      errors.push('NIK harus berupa 16 digit angka')
    }

    if (!name) {
      errors.push('Nama wajib diisi')
    }

    let landAreaHa: number | null = null
    if (landAreaRaw) {
      const parsed = parseFloat(landAreaRaw.replace(',', '.'))
      if (isNaN(parsed) || parsed < 0) {
        errors.push('Luas Lahan harus berupa angka positif')
      } else {
        landAreaHa = parsed
      }
    }

    results.push({
      row: i + 1,
      nik: nik.replace(/\s/g, ''),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      village: village.trim(),
      district: district.trim(),
      regency: regency.trim(),
      province: province.trim(),
      landAreaHa,
      farmerGroup: farmerGroup.trim(),
      error: errors.length > 0 ? errors.join('; ') : undefined,
      valid: errors.length === 0,
    })
  }

  return results
}