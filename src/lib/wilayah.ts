export interface Province { id: string; name: string }
export interface Regency { id: string; province_id: string; name: string }
export interface District { id: string; regency_id: string; name: string }

export const fetchProvinces = async () => {
  const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
  return res.json() as Promise<Province[]>
}

export const fetchRegencies = async (provinceId: string) => {
  if (!provinceId) return []
  const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`)
  return res.json() as Promise<Regency[]>
}

export const fetchDistricts = async (regencyId: string) => {
  if (!regencyId) return []
  const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regencyId}.json`)
  return res.json() as Promise<District[]>
}
