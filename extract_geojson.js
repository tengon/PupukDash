const fs = require('fs')
const path = require('path')

const inputPath = path.join(__dirname, 'public', 'gadm41_IDN_3.json')
const outputPath = path.join(__dirname, 'public', 'kab_semarang.geojson')

console.log('Membaca file GADM (mungkin butuh waktu beberapa detik karena ukurannya besar)...')

try {
  const rawData = fs.readFileSync(inputPath, 'utf8')
  const geojson = JSON.parse(rawData)

  console.log(`Berhasil memuat file GADM. Total Poligon: ${geojson.features.length}`)
  
  // Mencari "Semarang" di properti NAME_2 (Kabupaten/Kota)
  const filteredFeatures = geojson.features.filter(f => {
    const name2 = f.properties.NAME_2 || ''
    return name2.toLowerCase() === 'semarang'
  })

  console.log(`Ditemukan ${filteredFeatures.length} kecamatan di Kabupaten Semarang.`)

  if (filteredFeatures.length === 0) {
    console.log('ERROR: Tidak ada data kecamatan yang ditemukan untuk Kabupaten Semarang. Pastikan struktur property NAME_2 benar.')
    process.exit(1)
  }

  const outputGeoJson = {
    type: 'FeatureCollection',
    features: filteredFeatures
  }

  fs.writeFileSync(outputPath, JSON.stringify(outputGeoJson))
  console.log(`Berhasil mengekstrak! File tersimpan di: ${outputPath}`)

} catch (error) {
  console.error('Terjadi kesalahan:', error.message)
}
