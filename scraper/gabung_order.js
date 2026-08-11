/**
 * Script Penggabung: Merge Monitoring Order + Monitoring DO -> order_full.json
 */
const fs = require('fs');
const path = require('path');

function mergeOrderAndDo() {
  console.log('🔄 Memulai proses penggabungan data Monitoring Order + Monitoring DO...');

  let moPath = path.join(__dirname, 'monitoring_order_full.json');
  if (!fs.existsSync(moPath)) moPath = path.join('d:', 'testGet', 'monitoring_order_full.json');

  let doPath = path.join(__dirname, 'monitoring_do_full.json');
  if (!fs.existsSync(doPath)) doPath = path.join('d:', 'testGet', 'monitoring_do_full.json');

  let orders = [];
  if (fs.existsSync(moPath)) {
    try {
      const raw = fs.readFileSync(moPath, 'utf-8');
      orders = JSON.parse(raw).data || [];
    } catch (e) {
      console.error('❌ Gagal membaca monitoring_order_full.json:', e.message);
    }
  } else {
    console.warn('⚠️ File monitoring_order_full.json tidak ditemukan.');
  }

  let dos = [];
  if (fs.existsSync(doPath)) {
    try {
      const raw = fs.readFileSync(doPath, 'utf-8');
      dos = JSON.parse(raw).data || [];
    } catch (e) {
      console.error('❌ Gagal membaca monitoring_do_full.json:', e.message);
    }
  } else {
    console.warn('⚠️ File monitoring_do_full.json tidak ditemukan.');
  }

  const doMap = new Map();
  dos.forEach(d => {
    if (d.noPenebusan) doMap.set(d.noPenebusan.trim(), d);
    if (d.kodeSo) doMap.set(d.kodeSo.trim(), d);
  });

  const combined = orders.map(ord => {
    const matchDo = doMap.get((ord.noPenebusan || '').trim()) || doMap.get((ord.kodeSo || '').trim());
    return {
      ...ord,
      nomorDo: matchDo?.nomorDo || '',
      namaProduk: matchDo?.namaProduk || '',
      qtyKg: matchDo?.qty || '',
      tglDo: matchDo?.tanggalDo || '',
    };
  });

  const outputPath = path.join(__dirname, 'order_full.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    scraped_at: new Date().toISOString(),
    total: combined.length,
    data: combined,
  }, null, 2));

  console.log(`✅ Sukses menggabungkan ${combined.length} data order -> order_full.json`);
  return combined;
}

if (require.main === module) {
  mergeOrderAndDo();
}

module.exports = { mergeOrderAndDo };
