const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../db/custom.db');
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

async function populateLaporanPkp() {
  console.log('🚀 Memulai pengisian data ke tabel LaporanPkp di database SQLite...');

  let filePath = path.join(__dirname, 'laporan_item_penyaluran_pkp_full.json');
  if (!fs.existsSync(filePath)) {
    filePath = path.join('d:', 'testGet', 'laporan_item_penyaluran_pkp_full.json');
  }

  if (!fs.existsSync(filePath)) {
    console.error('❌ File laporan_item_penyaluran_pkp_full.json tidak ditemukan.');
    process.exit(1);
  }

  // Load Order map to lookup tglSo
  const orderMap = new Map();
  let orderPath = path.join(__dirname, 'order_full.json');
  if (fs.existsSync(orderPath)) {
    try {
      const rawOrd = fs.readFileSync(orderPath, 'utf-8');
      const ordList = JSON.parse(rawOrd).data || [];
      ordList.forEach(o => {
        if (o.noPenebusan && o.tglOrder) orderMap.set(o.noPenebusan.trim(), o.tglOrder);
        if (o.kodeSo && o.tglOrder) orderMap.set(o.kodeSo.trim(), o.tglOrder);
      });
    } catch (e) {}
  }

  let poPath = path.join(__dirname, 'penyaluran_pemenuhan_order_kios_full.json');
  if (fs.existsSync(poPath)) {
    try {
      const rawPo = fs.readFileSync(poPath, 'utf-8');
      const poList = JSON.parse(rawPo).data || [];
      poList.forEach(p => {
        if (p.noOrderPengecer && p.tanggalPenyaluran) orderMap.set(p.noOrderPengecer.trim(), p.tanggalPenyaluran);
        if (p.kodeSo && p.tanggalPenyaluran) orderMap.set(p.kodeSo.trim(), p.tanggalPenyaluran);
      });
    } catch (e) {}
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const dataList = JSON.parse(raw).data || [];

  console.log(`📦 Memproses ${dataList.length} record Laporan Item Penyaluran (No. PKP)...`);

  let count = 0;
  for (const item of dataList) {
    if (!item.noPkp) continue;

    const qtyTon = parseFloat(String(item.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const qtyKg = qtyTon * 1000;

    const tglSo = item.tglSo || orderMap.get((item.noPenebusan || '').trim()) || orderMap.get((item.kodeSo || '').trim()) || item.tglPenyaluran || '';

    try {
      await prisma.laporanPkp.upsert({
        where: {
          noPkp_noPenebusan_kodePengecer_productName: {
            noPkp: item.noPkp,
            noPenebusan: item.noPenebusan || '',
            kodePengecer: item.kodePengecer || '',
            productName: item.produk || 'UREA',
          },
        },
        update: {
          produsen: item.produsen || null,
          distributor: item.distributor || null,
          kodeDistributor: item.kodeDistributor || null,
          tipePenyaluran: item.tipePenyaluran || null,
          kodeSo: item.kodeSo || null,
          tglSo: tglSo || null,
          tahun: item.tahun || null,
          bulan: item.bulan || null,
          tglPenyaluran: item.tglPenyaluran || null,
          provinsi: item.provinsi || null,
          kabupaten: item.kabupaten || null,
          kecamatan: item.kecamatan || null,
          pengecer: item.pengecer || null,
          quantityTon: qtyTon,
          quantityKg: qtyKg,
          status: item.status || null,
          schemaType: item.schema || null,
          statusIpubers: item.statusIpubers || null,
          rawJson: JSON.stringify({ ...item, tglSo }),
          updatedAt: new Date(),
        },
        create: {
          noPkp: item.noPkp,
          produsen: item.produsen || null,
          distributor: item.distributor || null,
          kodeDistributor: item.kodeDistributor || null,
          tipePenyaluran: item.tipePenyaluran || null,
          noPenebusan: item.noPenebusan || '',
          kodeSo: item.kodeSo || null,
          tglSo: tglSo || null,
          tahun: item.tahun || null,
          bulan: item.bulan || null,
          tglPenyaluran: item.tglPenyaluran || null,
          provinsi: item.provinsi || null,
          kabupaten: item.kabupaten || null,
          kecamatan: item.kecamatan || null,
          kodePengecer: item.kodePengecer || '',
          pengecer: item.pengecer || null,
          productName: item.produk || 'UREA',
          quantityTon: qtyTon,
          quantityKg: qtyKg,
          status: item.status || null,
          schemaType: item.schema || null,
          statusIpubers: item.statusIpubers || null,
          rawJson: JSON.stringify({ ...item, tglSo }),
        },
      });
      count++;
    } catch (err) {
      console.error(`❌ Gagal upsert ${item.noPkp}:`, err.message);
    }
  }

  console.log(`✅ SUKSES! Terisi ${count} record ke tabel LaporanPkp di database (${dbPath}).`);
  await prisma.$disconnect();
}

populateLaporanPkp().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
