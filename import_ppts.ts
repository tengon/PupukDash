import fs from 'fs'
import path from 'path'

async function main() {
  const dirPath = 'D:\\Anugerah Makmur\\SPJB\\PPTS'
  const files = fs.readdirSync(dirPath)
  const jsonFiles = files.filter(f => f.endsWith('.json'))
  
  console.log(`Found ${jsonFiles.length} JSON files.`)

  let count = 0
  for (const file of jsonFiles) {
    const filePath = path.join(dirPath, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    
    const item = data[0]
    
    try {
      const headers = item.table_1?.headers || []
      const pptsInfoStr = headers[1] || ''
      const pptsMatch = pptsInfoStr.match(/: (RT\d+) - (.*)/)
      if (!pptsMatch) {
        console.log(`Skipping ${file} - Could not parse PPTS info`)
        continue
      }
      const code = pptsMatch[1]
      const name = pptsMatch[2]

      const rows = item.table_1?.rows || []
      const row1 = rows[0] || {}
      
      const regencyRaw = row1[headers[1]] || ''
      const regencyMatch = regencyRaw.match(/: \d+ - KAB\. (.*)/i) || regencyRaw.match(/: \d+ - KOTA (.*)/i)
      let regency = regencyRaw.replace(/: \d+ - /, '')
      if (regencyMatch) regency = regencyMatch[1].trim()
      regency = regency.charAt(0).toUpperCase() + regency.slice(1).toLowerCase()

      const provinceRaw = row1[headers[3]] || ''
      let province = provinceRaw.replace(/: \d+ - /, '').trim()

      const text = item.text || ''
      const districtMatch = text.match(/#\tKacamatan[\s\S]*?\n\t(.*?)\n/)
      let district = districtMatch ? districtMatch[1].trim() : ''

      const address = `${district ? `Kec. ${district}, ` : ''}${regency ? `Kab. ${regency}, ` : ''}${province}`

      // Extract spjbValidFrom and spjbValidUntil from table_1 rows[1]
      const row2 = rows[1] || {}
      let spjbValidFrom = null
      let spjbValidUntil = null
      if (headers[1]) {
        const fromRaw = row2[headers[1]] || ''
        spjbValidFrom = fromRaw.replace(/: /, '').trim()
      }
      if (headers[3]) {
        const untilRaw = row2[headers[3]] || ''
        spjbValidUntil = untilRaw.replace(/: /, '').trim()
      }

      // Extract alokasiUrea and alokasiNpk from table_2
      const table2Rows = item.table_2?.rows || []
      let alokasiUrea = null
      let alokasiNpk = null
      for (const r of table2Rows) {
        if (r['Kacamatan'] === 'Urea') {
          alokasiUrea = parseFloat(r['Alokasi SPJB']) || null
        }
        if (r['Kacamatan'] === 'NPK') {
          alokasiNpk = parseFloat(r['Alokasi SPJB']) || null
        }
      }

      // Extract spjbNumber and spjbDate from table_3
      const table3Rows = item.table_3?.rows || []
      let spjbNumber = null
      let spjbDate = null
      if (table3Rows.length > 0) {
        spjbNumber = table3Rows[0]['Nomor Dokument'] || null
        spjbDate = table3Rows[0]['Tanggal Buat'] || null
      }

      const payload = {
        code,
        name,
        address,
        district,
        regency,
        province,
        spjbNumber,
        spjbDate,
        spjbValidFrom,
        spjbValidUntil,
        alokasiUrea,
        alokasiNpk
      }

      // Try hitting the local Next.js API
      const res = await fetch('http://localhost:3001/api/ppts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        console.log(`Successfully imported: ${code} - ${name} (${district})`)
        count++
      } else {
        const errorText = await res.text()
        console.error(`Failed to import ${code}:`, errorText)
      }
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message)
    }
  }

  console.log(`Import completed. Total imported: ${count}`)
}

main().catch(console.error)
