'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapCoreProps {
  districtAllocations: Record<string, { urea: number, npk: number }>
}

export default function MapCore({ districtAllocations }: MapCoreProps) {
  const [geoData, setGeoData] = useState<any>(null)

  useEffect(() => {
    fetch('/kab_semarang.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Gagal memuat GeoJSON Kabupaten Semarang:', err))
  }, [])

  if (!geoData) {
    return (
      <div className="w-full h-full min-h-[350px] bg-muted/20 flex items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        <span className="animate-pulse">Memuat Peta Batas Wilayah...</span>
      </div>
    )
  }

  // Hitung pusat peta statis untuk Kabupaten Semarang
  const center: [number, number] = [-7.215, 110.420] 

  // Fungsi untuk memberi style warna berdasarkan alokasi
  const styleFeature = (feature: any) => {
    const distName = feature.properties.NAME_3
    // Cocokkan nama kecamatan GADM dengan database (case-insensitive)
    const allocKey = Object.keys(districtAllocations).find(
      k => k.toLowerCase() === distName?.toLowerCase()
    )
    const alloc = allocKey ? districtAllocations[allocKey] : null
    const total = alloc ? alloc.urea + alloc.npk : 0

    // Gradasi hijau (semakin besar alokasi, semakin solid/pekat)
    let fillColor = '#e2e8f0' // default abu-abu (tidak ada data)
    let fillOpacity = 0.4

    if (total > 0) {
      if (total > 150) fillColor = '#047857' // emerald-700
      else if (total > 100) fillColor = '#059669' // emerald-600
      else if (total > 50) fillColor = '#10b981' // emerald-500
      else fillColor = '#34d399' // emerald-400
      fillOpacity = 0.7
    }

    return {
      fillColor,
      weight: 1.5,
      opacity: 1,
      color: '#ffffff', // Garis batas putih
      fillOpacity
    }
  }

  // Fungsi interaksi setiap kecamatan (Tooltip & Hover)
  const onEachFeature = (feature: any, layer: any) => {
    const distName = feature.properties.NAME_3
    const allocKey = Object.keys(districtAllocations).find(
      k => k.toLowerCase() === distName?.toLowerCase()
    )
    const alloc = allocKey ? districtAllocations[allocKey] : { urea: 0, npk: 0 }

    layer.on({
      mouseover: (e: any) => {
        const target = e.target
        target.setStyle({
          weight: 3,
          color: '#1e293b', // Garis hitam tegas saat di-hover
          fillOpacity: 0.9
        })
        target.bringToFront()
      },
      mouseout: (e: any) => {
        layer.setStyle(styleFeature(feature))
      }
    })

    // Bind Tooltip berisi info
    const popupContent = `
      <div class="space-y-1 p-1 min-w-[140px]">
        <div class="font-bold border-b pb-1 text-sm">${distName}</div>
        <div class="flex justify-between items-center gap-4 text-xs mt-1">
          <span class="text-gray-600">Urea:</span>
          <span class="font-bold text-amber-600">${alloc.urea.toLocaleString('id-ID')} Ton <span class="font-normal text-[10px] text-gray-500">(${(alloc.urea * 1000).toLocaleString('id-ID')} Kg)</span></span>
        </div>
        <div class="flex justify-between items-center gap-4 text-xs">
          <span class="text-gray-600">NPK:</span>
          <span class="font-bold text-rose-600">${alloc.npk.toLocaleString('id-ID')} Ton <span class="font-normal text-[10px] text-gray-500">(${(alloc.npk * 1000).toLocaleString('id-ID')} Kg)</span></span>
        </div>
      </div>
    `
    layer.bindPopup(popupContent)
    layer.bindTooltip(distName, { permanent: false, direction: 'center', className: 'bg-white/90 border-0 font-semibold text-[10px] shadow-sm' })
  }

  return (
    <MapContainer 
      center={center} 
      zoom={10} 
      scrollWheelZoom={true} /* ZOOM DIAKTIFKAN MENGGUNAKAN SCROLL MOUSE */
      style={{ height: '400px', width: '100%', borderRadius: '0.5rem', zIndex: 10 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <GeoJSON 
        data={geoData} 
        style={styleFeature}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  )
}
