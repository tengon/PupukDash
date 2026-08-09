/**
 * Script untuk menggabungkan seluruh 4 file data Penyaluran GOW CM:
 *  1. penyaluran_monitoring_order_kios_full.json
 *  2. penyaluran_pemenuhan_order_kios_full.json
 *  3. penyaluran_monitoring_pop_full.json
 *  4. penyaluran_surat_jalan_full.json
 *
 * Output: penyaluran_full.json
 */

const fs = require('fs');
const path = require('path');

const FILE_ORDER_KIOS = 'penyaluran_monitoring_order_kios_full.json';
const FILE_PEMENUHAN   = 'penyaluran_pemenuhan_order_kios_full.json';
const FILE_POP         = 'penyaluran_monitoring_pop_full.json';
const FILE_SURAT_JALAN = 'penyaluran_surat_jalan_full.json';
const OUTPUT_FILE      = 'penyaluran_full.json';

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File ${filePath} tidak ditemukan.`);
    return { data: [] };
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return {
      scraped_at: parsed.scraped_at || null,
      total_records: parsed.total_records || (Array.isArray(parsed.data) ? parsed.data.length : 0),
      data: Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : [])
    };
  } catch (e) {
    console.error(`❌ Gagal membaca ${filePath}:`, e.message);
    return { data: [] };
  }
}

function main() {
  console.log('🔄 Menggabungkan seluruh data Penyaluran ke Pengecer...');

  const orderKiosObj = readJsonSafe(FILE_ORDER_KIOS);
  const pemenuhanObj = readJsonSafe(FILE_PEMENUHAN);
  const popObj        = readJsonSafe(FILE_POP);
  const suratJalanObj = readJsonSafe(FILE_SURAT_JALAN);

  console.log(`  • Monitoring Order Kios : ${orderKiosObj.data.length} record`);
  console.log(`  • Pemenuhan Order (PKP) : ${pemenuhanObj.data.length} record`);
  console.log(`  • Monitoring POP        : ${popObj.data.length} record`);
  console.log(`  • Surat Jalan           : ${suratJalanObj.data.length} record`);

  // Map Pemenuhan Order berdasarkan noOrderPengecer (Nomor PSN...)
  const pemenuhanMap = new Map();
  pemenuhanObj.data.forEach(item => {
    const key = item.noOrderPengecer || item.nomorOrder || '';
    if (key) {
      if (!pemenuhanMap.has(key)) {
        pemenuhanMap.set(key, []);
      }
      pemenuhanMap.get(key).push(item);
    }
  });

  // Gabungkan Orders dengan Rincian Pemenuhan
  let matchedOrderCount = 0;
  const correlatedOrders = orderKiosObj.data.map(order => {
    const orderNo = order.nomorOrder || '';
    const pemenuhanList = pemenuhanMap.get(orderNo) || [];

    if (pemenuhanList.length > 0) {
      matchedOrderCount++;
    }

    return {
      nomorOrder: order.nomorOrder,
      statusOrder: order.status,
      kodePengecer: order.kodePengecer,
      namaPengecer: order.namaPengecer,
      provinsi: order.provinsi,
      kabupatenKota: order.kabupatenKota,
      kecamatan: order.kecamatan,
      tanggalOrder: order.tanggalOrder,
      durasiOrder: order.durasiOrder,
      pembayaran: order.pembayaran,
      nilaiOrderRupiah: order.nilaiOrderRupiah,
      totalQtyTon: order.totalQtyTon,
      terakhirDiperbarui: order.terakhirDiperbarui,
      kodeDistributor: order.kodeDistributor,
      namaDistributor: order.namaDistributor,
      detailPemenuhanCount: pemenuhanList.length,
      detailPemenuhan: pemenuhanList.map(p => ({
        noPkp: p.noPkp,
        kodeSo: p.kodeSo,
        produk: p.produk,
        qtyTon: p.qtyTon,
        status: p.status,
        tanggalPenyaluran: p.tanggalPenyaluran,
      }))
    };
  });

  // Output Gabungan
  const result = {
    updated_at: new Date().toISOString(),
    source: "GOW CM - Penyaluran Terintegrasi (Gabungan 4 Menu)",
    summary: {
      total_monitoring_order_kios: orderKiosObj.data.length,
      total_pemenuhan_order_kios: pemenuhanObj.data.length,
      total_monitoring_pop: popObj.data.length,
      total_surat_jalan: suratJalanObj.data.length,
      total_orders_matched_with_pemenuhan: matchedOrderCount,
    },
    orders_terintegrasi: correlatedOrders,
    raw_sections: {
      monitoring_order_kios: orderKiosObj.data,
      pemenuhan_order_kios: pemenuhanObj.data,
      monitoring_pop: popObj.data,
      surat_jalan: suratJalanObj.data,
    }
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');

  const line = '='.repeat(80);
  console.log(`\n${line}`);
  console.log(`✅ SUKSES MENGGABUNGKAN DATA PENYALURAN`);
  console.log(line);
  console.log(`📊 RINGKASAN DATA PENYALURAN GABUNGAN:`);
  console.log(`  1. Monitoring Order Kios : ${orderKiosObj.data.length} Order`);
  console.log(`  2. Pemenuhan Order Kios  : ${pemenuhanObj.data.length} Record Rincian`);
  console.log(`  3. Monitoring POP        : ${popObj.data.length} Dokumen POP`);
  console.log(`  4. Surat Jalan           : ${suratJalanObj.data.length} Surat Jalan`);
  console.log(`  🔗 Order Terhubung (Matched PKP): ${matchedOrderCount} dari ${orderKiosObj.data.length} Order`);
  console.log(line);
  console.log(`💾 File hasil penggabungan disimpan di: ${OUTPUT_FILE}\n`);
}

main();
