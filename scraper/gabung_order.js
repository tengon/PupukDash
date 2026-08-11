/**
 * Script Penggabung: Merge Monitoring Order + Monitoring DO -> order_full.json
 */
const fs = require('fs');
const path = require('path');

function parseNum(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
}

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
  }

  let dos = [];
  if (fs.existsSync(doPath)) {
    try {
      const raw = fs.readFileSync(doPath, 'utf-8');
      dos = JSON.parse(raw).data || [];
    } catch (e) {
      console.error('❌ Gagal membaca monitoring_do_full.json:', e.message);
    }
  }

  // Group DO items by noPenebusan & kodeSo & kodeBooking
  const doGroupMap = new Map();
  dos.forEach(d => {
    const keys = [d.noPenebusan, d.kodeSo].filter(Boolean);
    keys.forEach(key => {
      const k = key.trim();
      if (!doGroupMap.has(k)) doGroupMap.set(k, []);
      doGroupMap.get(k).push(d);
    });
  });

  const processedNoPenebusan = new Set();

  const combined = orders.map(ord => {
    const keyNo = (ord.noPenebusan || '').trim();
    const keySo = (ord.kodeSo || '').trim();
    const keyBooking = (ord.kodeBooking || '').trim();

    if (keyNo) processedNoPenebusan.add(keyNo);

    // Collect all matching DO rows
    const matches = doGroupMap.get(keyNo) || doGroupMap.get(keySo) || doGroupMap.get(keyBooking) || [];

    const matchedSo = ord.kodeSo || matches.find(m => m.kodeSo)?.kodeSo || ord.kodeBooking || '';
    const uniqueDoNums = Array.from(new Set(matches.map(m => m.nomorDo).filter(Boolean)));
    const uniqueProds = Array.from(new Set(matches.map(m => m.namaProduk).filter(Boolean)));
    const totalDoQtyKg = matches.reduce((sum, m) => sum + parseNum(m.qty || m.totalKuantitas), 0);
    const tglDo = matches[0]?.tanggalDo || ord.tglDo || '';

    return {
      ...ord,
      kodeSo: matchedSo,
      nomorDo: uniqueDoNums.join(', ') || ord.nomorDo || '',
      namaProduk: uniqueProds.join(' + ') || ord.namaProduk || '',
      qtyKg: totalDoQtyKg > 0 ? totalDoQtyKg.toString() : (ord.qtyKg || ''),
      tglDo: tglDo,
    };
  });

  // Append DOs that are not present in Monitoring Order
  dos.forEach(d => {
    if (d.noPenebusan && !processedNoPenebusan.has(d.noPenebusan.trim())) {
      processedNoPenebusan.add(d.noPenebusan.trim());
      combined.push({
        noPenebusan: d.noPenebusan,
        kodeReferensi: '',
        namaDistributor: d.distributor || 'CV. ANUGERAH MAKMUR',
        namaProdusen: d.namaProdusen || '',
        kodeBooking: '',
        batasAkhir: '',
        tglPengambilan: '',
        tglRencana: '',
        tglOrder: d.tglOrder || '',
        status: 'DO TERBIT',
        kodeSo: d.kodeSo || '',
        detailHref: '',
        nomorDo: d.nomorDo || '',
        namaProduk: d.namaProduk || '',
        qtyKg: d.qty || d.totalKuantitas || '',
        tglDo: d.tanggalDo || '',
      });
    }
  });

  const outputPath = path.join(__dirname, 'order_full.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    scraped_at: new Date().toISOString(),
    total: combined.length,
    data: combined,
  }, null, 2));

  console.log(`✅ Sukses menyelaraskan kodeSo dengan noPenebusan (${combined.length} record) -> order_full.json`);
  return combined;
}

if (require.main === module) {
  mergeOrderAndDo();
}

module.exports = { mergeOrderAndDo };
