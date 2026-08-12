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

  const raw = fs.readFileSync(filePath, 'utf-8');
  const dataList = JSON.parse(raw).data || [];

  console.log(`📦 Memproses ${dataList.length} record Laporan Item Penyaluran (No. PKP)...`);

  let count = 0;
  for (const item of dataList) {
    if (!item.noPkp) continue;

    const qtyTon = parseFloat(String(item.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const qtyKg = qtyTon * 1000;

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
          rawJson: JSON.stringify(item),
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
          rawJson: JSON.stringify(item),
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
